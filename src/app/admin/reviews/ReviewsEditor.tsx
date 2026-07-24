'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Review } from '@/lib/content'
import styles from './reviews.module.css'
import admin from '../admin.module.css'

/**
 * Manage the reviews shown on the home page.
 *
 * Only real reviews with a real name belong here — a fabricated testimonial is
 * the one thing on this site that would genuinely mislead someone, so this
 * screen leads with that. The public section stays hidden entirely until at
 * least one is added, so an empty list never shows as an empty heading.
 */
export function ReviewsEditor({ initial }: { initial: Review[] }) {
  const router = useRouter()
  const [reviews, setReviews] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const r = await fetch('/api/admin/reviews').then((x) => x.json())
    if (r?.ok) setReviews(r.reviews)
    router.refresh()
  }

  async function call(
    url: string,
    options: RequestInit,
    ok: string
  ): Promise<boolean> {
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.ok) throw new Error(body?.message ?? 'That did not save.')
      setNotice(ok)
      await refresh()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save.')
      return false
    }
  }

  return (
    <>
      <div className={admin.pageHead}>
        <h1 className={admin.pageTitle}>Reviews</h1>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setAdding(true)
            setEditing(null)
          }}
        >
          Add a review
        </button>
      </div>

      <div className={admin.notice}>
        <h2>Only real reviews, with a real name</h2>
        <p>
          These appear on your home page. Use genuine ones — a screenshot of an
          Instagram comment or a text is a good source. Ask the person before
          using their name. The section stays hidden on the site until you add
          the first one.
        </p>
      </div>

      <div aria-live="polite" className={styles.banner}>
        {error && <p className={styles.error}>{error}</p>}
        {notice && !error && <p className={styles.ok}>{notice}</p>}
      </div>

      {adding && (
        <ReviewForm
          heading="New review"
          onCancel={() => setAdding(false)}
          onSubmit={async (draft) => {
            const ok = await call(
              '/api/admin/reviews',
              { method: 'POST', body: JSON.stringify(draft) },
              'Review added. It is live on the home page in a few seconds.'
            )
            if (ok) setAdding(false)
          }}
        />
      )}

      {reviews.length === 0 && !adding ? (
        <p className={admin.empty}>
          No reviews yet. Add your first and it appears on the home page.
        </p>
      ) : (
        <div className={styles.list}>
          {reviews.map((review) =>
            editing === review.id ? (
              <ReviewForm
                key={review.id}
                heading={`Editing ${review.name}`}
                initial={review}
                onCancel={() => setEditing(null)}
                onSubmit={async (draft) => {
                  const ok = await call(
                    `/api/admin/reviews/${review.id}`,
                    { method: 'PATCH', body: JSON.stringify(draft) },
                    'Saved.'
                  )
                  if (ok) setEditing(null)
                }}
                onDelete={async () => {
                  await call(
                    `/api/admin/reviews/${review.id}`,
                    { method: 'DELETE' },
                    'Review removed.'
                  )
                  setEditing(null)
                }}
              />
            ) : (
              <article key={review.id} className={styles.card}>
                <blockquote className={styles.quote}>
                  &ldquo;{review.quote}&rdquo;
                </blockquote>
                <p className={styles.attribution}>
                  {review.name}
                  {review.occasion && <span> · {review.occasion}</span>}
                </p>
                <button
                  type="button"
                  className={styles.edit}
                  onClick={() => {
                    setEditing(review.id)
                    setAdding(false)
                  }}
                >
                  Edit
                </button>
              </article>
            )
          )}
        </div>
      )}
    </>
  )
}

type Draft = { quote: string; name: string; occasion: string }

function ReviewForm({
  heading,
  initial,
  onCancel,
  onSubmit,
  onDelete,
}: {
  heading: string
  initial?: Review
  onCancel: () => void
  onSubmit: (draft: Draft) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>({
    quote: initial?.quote ?? '',
    name: initial?.name ?? '',
    occasion: initial?.occasion ?? '',
  })
  const [saving, setSaving] = useState(false)

  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        await onSubmit(draft)
        setSaving(false)
      }}
    >
      <h2 className={styles.formHeading}>{heading}</h2>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="r-quote">
          What they said
        </label>
        <textarea
          id="r-quote"
          rows={3}
          required
          value={draft.quote}
          placeholder="The cake was exactly what I asked for and tasted even better."
          onChange={(e) => setDraft((d) => ({ ...d, quote: e.target.value }))}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="r-name">
            Name
          </label>
          <input
            id="r-name"
            type="text"
            required
            value={draft.name}
            placeholder="Priya M."
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="r-occasion">
            Occasion (optional)
          </label>
          <input
            id="r-occasion"
            type="text"
            value={draft.occasion}
            placeholder="Birthday cake"
            onChange={(e) => setDraft((d) => ({ ...d, occasion: e.target.value }))}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className="btn"
          disabled={saving || !draft.quote.trim() || !draft.name.trim()}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn--quiet" onClick={onCancel}>
          Cancel
        </button>
        {onDelete && (
          <button
            type="button"
            className={styles.danger}
            onClick={() => {
              if (confirm('Remove this review from the site?')) onDelete()
            }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
