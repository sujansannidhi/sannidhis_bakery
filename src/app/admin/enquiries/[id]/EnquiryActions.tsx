'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ENQUIRY_STATUSES, STATUS_LABELS, type EnquiryStatus } from '@/lib/validation'
import styles from './actions.module.css'

export function EnquiryActions({
  id,
  status: initialStatus,
  adminNotes: initialNotes,
  email,
  name,
}: {
  id: string
  status: EnquiryStatus
  adminNotes: string
  email: string
  name: string
}) {
  const router = useRouter()
  const [status, setStatus] = useState<EnquiryStatus>(initialStatus)
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = status !== initialStatus || notes !== initialNotes

  async function save(patch: { status?: EnquiryStatus; adminNotes?: string }) {
    setSaving(true)
    setError(null)
    setSaved(false)
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
      setSaved(true)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save that.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.block}>
        <h2 className={styles.heading}>Status</h2>
        <div className={styles.statuses}>
          {ENQUIRY_STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              className={styles.status}
              aria-pressed={status === option}
              disabled={saving}
              onClick={() => {
                setStatus(option)
                save({ status: option })
              }}
            >
              {STATUS_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.block}>
        <h2 className={styles.heading}>
          <label htmlFor="adminNotes">Private notes</label>
        </h2>
        <p className={styles.hint}>
          Only visible here. The customer never sees this.
        </p>
        <textarea
          id="adminNotes"
          className={styles.notes}
          rows={7}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Quoted $120 on the 3rd. Wants the butterfly design in blue."
        />
        <button
          type="button"
          className="btn"
          disabled={saving || notes === initialNotes}
          onClick={() => save({ adminNotes: notes })}
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
      </div>

      <div className={styles.block}>
        <h2 className={styles.heading}>Reply</h2>
        <a
          className={`btn ${styles.reply}`}
          href={`mailto:${email}?subject=${encodeURIComponent(
            `Your cake enquiry — Sannidhi's Bakery`
          )}&body=${encodeURIComponent(`Hi ${name.split(' ')[0]},\n\n`)}`}
        >
          Email {name.split(' ')[0]}
        </a>
      </div>

      <div aria-live="polite" className={styles.feedback}>
        {error && <span className={styles.error}>{error}</span>}
        {saved && !error && !dirty && <span className={styles.ok}>Saved.</span>}
      </div>
    </aside>
  )
}
