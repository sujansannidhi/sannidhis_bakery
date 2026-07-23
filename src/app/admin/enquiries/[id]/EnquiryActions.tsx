'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ENQUIRY_STATUSES,
  STATUS_LABELS,
  type EnquiryStatus,
} from '@/lib/validation'
import { formatMoney, fromCents, outstanding, received, toCents } from '@/lib/money'
import styles from './actions.module.css'

type Money = {
  quotedAmount: number | null
  depositAmount: number | null
  depositPaid: boolean
  finalAmount: number | null
  paidInFull: boolean
}

export function EnquiryActions({
  id,
  status: initialStatus,
  adminNotes: initialNotes,
  email,
  name,
  money: initialMoney,
  quoteDraft,
  mailReady,
}: {
  id: string
  status: EnquiryStatus
  adminNotes: string
  email: string
  name: string
  money: Money
  quoteDraft: { subject: string; body: string }
  mailReady: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState<EnquiryStatus>(initialStatus)
  const [notes, setNotes] = useState(initialNotes)
  const [money, setMoney] = useState<Money>(initialMoney)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)

  async function save(patch: Record<string, unknown>, message: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/enquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.ok) {
        throw new Error(body?.message ?? 'Could not save that.')
      }
      setNotice(message)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save that.')
    } finally {
      setBusy(false)
    }
  }

  const moneyDirty =
    money.quotedAmount !== initialMoney.quotedAmount ||
    money.depositAmount !== initialMoney.depositAmount ||
    money.depositPaid !== initialMoney.depositPaid ||
    money.finalAmount !== initialMoney.finalAmount ||
    money.paidInFull !== initialMoney.paidInFull

  return (
    <aside className={styles.panel}>
      {/* ── Status ─────────────────────────────────────────────────────── */}
      <div className={styles.block}>
        <h2 className={styles.heading}>Status</h2>
        <div className={styles.statuses}>
          {ENQUIRY_STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              className={styles.status}
              aria-pressed={status === option}
              disabled={busy}
              onClick={() => {
                setStatus(option)
                save({ status: option }, `Marked ${STATUS_LABELS[option].toLowerCase()}.`)
              }}
            >
              {STATUS_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Money ──────────────────────────────────────────────────────── */}
      <div className={styles.block}>
        <h2 className={styles.heading}>Money</h2>

        <MoneyField
          id="quotedAmount"
          label="Quoted"
          value={money.quotedAmount}
          onChange={(v) => setMoney((m) => ({ ...m, quotedAmount: v }))}
        />

        <MoneyField
          id="depositAmount"
          label="Deposit"
          value={money.depositAmount}
          onChange={(v) => setMoney((m) => ({ ...m, depositAmount: v }))}
        />
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={money.depositPaid}
            onChange={(e) =>
              setMoney((m) => ({ ...m, depositPaid: e.target.checked }))
            }
          />
          Deposit received
        </label>

        <MoneyField
          id="finalAmount"
          label="Final payment"
          value={money.finalAmount}
          onChange={(v) => setMoney((m) => ({ ...m, finalAmount: v }))}
        />
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={money.paidInFull}
            onChange={(e) =>
              setMoney((m) => ({ ...m, paidInFull: e.target.checked }))
            }
          />
          Final payment received
        </label>

        <p className={styles.summary}>
          Received <strong>{formatMoney(received(money))}</strong>
          {outstanding(money) > 0 && (
            <> · still owed {formatMoney(outstanding(money))}</>
          )}
        </p>

        <button
          type="button"
          className="btn"
          disabled={busy || !moneyDirty}
          onClick={() => save({ ...money }, 'Amounts saved.')}
        >
          {busy ? 'Saving…' : 'Save amounts'}
        </button>
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────── */}
      <div className={styles.block}>
        <h2 className={styles.heading}>
          <label htmlFor="adminNotes">Private notes</label>
        </h2>
        <p className={styles.hint}>Only visible here. The customer never sees this.</p>
        <textarea
          id="adminNotes"
          className={styles.notes}
          rows={5}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Wants the butterfly design in blue. Collecting at 4pm."
        />
        <button
          type="button"
          className="btn"
          disabled={busy || notes === initialNotes}
          onClick={() => save({ adminNotes: notes }, 'Notes saved.')}
        >
          Save notes
        </button>
      </div>

      {/* ── Email ──────────────────────────────────────────────────────── */}
      <div className={styles.block}>
        <h2 className={styles.heading}>Reply</h2>
        {composing ? (
          <QuoteComposer
            id={id}
            draft={quoteDraft}
            onDone={(message) => {
              setComposing(false)
              setNotice(message)
              router.refresh()
            }}
            onCancel={() => setComposing(false)}
          />
        ) : (
          <>
            <button
              type="button"
              className="btn"
              disabled={!mailReady}
              onClick={() => setComposing(true)}
            >
              Send a quote
            </button>
            {!mailReady && (
              <p className={styles.hint}>
                Email is not connected yet. Add <code>GMAIL_USER</code> and{' '}
                <code>GMAIL_APP_PASSWORD</code>.
              </p>
            )}
            <a className={styles.plainLink} href={`mailto:${email}`}>
              Or email {name.split(' ')[0]} from your own mail app
            </a>
          </>
        )}
      </div>

      <div aria-live="polite" className={styles.feedback}>
        {error && <span className={styles.error}>{error}</span>}
        {notice && !error && <span className={styles.ok}>{notice}</span>}
      </div>
    </aside>
  )
}

function MoneyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number | null
  onChange: (value: number | null) => void
}) {
  // Kept as text while editing so a half-typed "12." does not get reformatted
  // out from under the cursor.
  const [text, setText] = useState(fromCents(value))

  return (
    <div className={styles.moneyField}>
      <label className={styles.moneyLabel} htmlFor={id}>
        {label}
      </label>
      <div className={styles.moneyInput}>
        <span aria-hidden="true">$</span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          placeholder="0.00"
          onChange={(event) => {
            setText(event.target.value)
            onChange(toCents(event.target.value))
          }}
          onBlur={() => setText(fromCents(toCents(text)))}
        />
      </div>
    </div>
  )
}

function QuoteComposer({
  id,
  draft,
  onDone,
  onCancel,
}: {
  id: string
  draft: { subject: string; body: string }
  onDone: (message: string) => void
  onCancel: () => void
}) {
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className={styles.composer}>
      <p className={styles.hint}>
        Read it before you send — this goes straight to the customer.
      </p>

      <div className={styles.field}>
        <label className={styles.moneyLabel} htmlFor="quote-subject">
          Subject
        </label>
        <input
          id="quote-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.moneyLabel} htmlFor="quote-body">
          Message
        </label>
        <textarea
          id="quote-body"
          rows={14}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.composerActions}>
        <button
          type="button"
          className="btn"
          disabled={sending || !subject.trim() || !body.trim()}
          onClick={async () => {
            setSending(true)
            setError(null)
            try {
              const response = await fetch(`/api/admin/enquiries/${id}/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, body, markQuoted: true }),
              })
              const result = await response.json().catch(() => null)
              if (!response.ok || !result?.ok) {
                throw new Error(result?.message ?? 'Could not send.')
              }
              onDone('Quote sent.')
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'Could not send.')
            } finally {
              setSending(false)
            }
          }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
        <button type="button" className="btn btn--quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
