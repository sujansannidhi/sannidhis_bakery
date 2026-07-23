'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { submitOrder } from '@/lib/submit-order'
import { site } from '@/lib/site'
import type { Category, Product } from '@/lib/content'
import {
  DEFAULT_DESIGN,
  isDesigned,
  summarise,
  type CakeDesign,
} from '@/lib/cake-design'
import { downscale } from '@/lib/downscale'
import { CakeDesigner } from './CakeDesigner'
import { svgElementToPngDataUrl } from './rasterize'
import styles from './order.module.css'

type Errors = Record<string, string>

const OCCASIONS = [
  'Birthday',
  'Baby shower',
  'Wedding or engagement',
  'Anniversary',
  'Graduation',
  'Religious or cultural celebration',
  'Just because',
  'Something else',
]

const BUDGETS = ['Under $50', '$50–$100', '$100–$200', '$200+', 'Not sure yet']

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00`)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / 86_400_000)
}

export function OrderForm({
  products,
  categories,
}: {
  products: Product[]
  categories: Category[]
}) {
  const params = useSearchParams()
  const requested = params.get('product')
  const requestedProduct = products.find((p) => p.id === requested)

  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [eventDate, setEventDate] = useState('')

  // Controlled so the cake designer can appear when a cake is chosen. Seeded
  // from the product they arrived via, if any.
  const [category, setCategory] = useState(requestedProduct?.category ?? '')
  const [design, setDesign] = useState<CakeDesign>(DEFAULT_DESIGN)
  const exportRef = useRef<HTMLDivElement | null>(null)

  // The chosen category is a display name ("Cakes"); the product record carries
  // an id ("cakes"). Match on either so the designer shows for both paths.
  const isCake = /cake(?!\s*pop)/i.test(category) && !/cake\s*pop/i.test(category)

  const [inspirationUrl, setInspirationUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const minDays = site.leadTime.minDays
  const tooSoon =
    minDays !== null && eventDate !== '' && daysUntil(eventDate) < minDays

  async function uploadFile(file: File, kind: 'photo' | 'design'): Promise<string | null> {
    const shrunk = await downscale(file)
    const body = new FormData()
    body.append('file', shrunk, kind === 'design' ? 'cake-design.png' : 'photo.jpg')
    body.append('kind', kind)
    const response = await fetch('/api/enquiry-upload', { method: 'POST', body })
    const result = await response.json().catch(() => null)
    if (!response.ok || !result?.ok) throw new Error(result?.message ?? 'Upload failed.')
    return result.url as string
  }

  async function onInspirationChange(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      setInspirationUrl(await uploadFile(file, 'photo'))
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'That did not upload.')
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFailure(null)

    const form = e.currentTarget
    const data = new FormData(form)
    const value = (k: string) => String(data.get(k) ?? '').trim()

    // Honeypot. A real person never fills this; bots fill everything.
    if (value('_gotcha')) {
      setSent(true)
      return
    }

    const found: Errors = {}
    if (!value('Name')) found.Name = 'Please tell us your name.'
    if (!value('Email')) {
      found.Email = 'We need an email address to reply to.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('Email'))) {
      found.Email = 'That email address does not look right.'
    }
    if (!value('Event date')) {
      found['Event date'] = 'When is it for?'
    } else if (daysUntil(value('Event date')) < 0) {
      found['Event date'] = 'That date has already passed.'
    }
    if (!value('What you would like')) {
      found['What you would like'] = 'Tell us roughly what you are after.'
    }

    setErrors(found)
    if (Object.keys(found).length > 0) {
      const first = form.querySelector<HTMLElement>(`[data-field="${Object.keys(found)[0]}"]`)
      first?.focus()
      return
    }

    setSending(true)
    const payload: Record<string, string> = {}
    data.forEach((v, k) => {
      if (k !== '_gotcha') payload[k] = String(v)
    })
    if (requestedProduct) payload['Started from'] = requestedProduct.name

    // If they designed a cake, rasterise it and attach the summary + spec.
    if (isCake && isDesigned(design)) {
      payload['Cake design'] = summarise(design)
      payload.cakeDesign = JSON.stringify(design)
      try {
        const svg = exportRef.current?.querySelector('svg')
        if (svg) {
          const png = await svgElementToPngDataUrl(svg as SVGSVGElement)
          const blob = await (await fetch(png)).blob()
          const url = await uploadFile(new File([blob], 'design.png', { type: 'image/png' }), 'design')
          if (url) payload.cakeDesignImageUrl = url
        }
      } catch (e) {
        // A failed picture must not lose the enquiry — the summary still rides
        // along, and the owner still gets everything else.
        console.warn('[cake] could not attach design image:', e)
      }
    }

    if (inspirationUrl) payload.inspirationPhotoUrl = inspirationUrl

    const result = await submitOrder(payload)
    setSending(false)

    if (result.ok) {
      setSent(true)
      return
    }

    // The server validates independently of the checks above. If it rejected a
    // specific field, show it against that field rather than as a vague banner.
    if (result.errors && Object.keys(result.errors).length > 0) {
      setErrors(result.errors)
      const firstField = Object.keys(result.errors)[0]
      form
        .querySelector<HTMLElement>(`[data-field="${firstField}"]`)
        ?.focus()
    }
    setFailure(result.message)
  }

  if (sent) {
    return (
      <div className={styles.success} role="status">
        <span className={styles.successRule} aria-hidden="true" />
        <h2 className={styles.successTitle}>That&rsquo;s with us.</h2>
        <p>
          We read every enquiry ourselves, so it will be a person replying and
          not an automatic message. Expect to hear back within a couple of days
          with what we can make and what it would cost.
        </p>
        <p className={styles.successNote}>
          Nothing is booked until we have both agreed the design and the date.
          If your event is soon, message us on{' '}
          <a href={site.contact.instagramUrl} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>{' '}
          as well so it is not sitting in an inbox.
        </p>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {requestedProduct && (
        <p className={styles.startedFrom}>
          Starting from <strong>{requestedProduct.name}</strong>. Tell us what to
          change.
        </p>
      )}

      {/* Honeypot — visually hidden, never announced, never focusable. */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="_gotcha">Leave this empty</label>
        <input type="text" id="_gotcha" name="_gotcha" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>You</legend>

        <Field id="Name" label="Name" error={errors.Name} required>
          <input
            type="text"
            id="Name"
            name="Name"
            data-field="Name"
            autoComplete="name"
            required
            aria-invalid={Boolean(errors.Name)}
            aria-describedby={errors.Name ? 'Name-error' : undefined}
          />
        </Field>

        <Field id="Email" label="Email" error={errors.Email} required>
          <input
            type="email"
            id="Email"
            name="Email"
            data-field="Email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.Email)}
            aria-describedby={errors.Email ? 'Email-error' : undefined}
          />
        </Field>

        <Field id="Phone" label="Phone" hint="Optional, but faster if we have a question">
          <input
            type="tel"
            id="Phone"
            name="Phone"
            data-field="Phone"
            autoComplete="tel"
          />
        </Field>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>The occasion</legend>

        <Field
          id="Event date"
          label="Event date"
          error={errors['Event date']}
          required
          hint="The day you need it, not the day you want to collect"
        >
          <input
            type="date"
            id="Event date"
            name="Event date"
            data-field="Event date"
            min={todayISO()}
            required
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            aria-invalid={Boolean(errors['Event date'])}
            aria-describedby={
              [
                errors['Event date'] ? 'Event date-error' : null,
                tooSoon ? 'lead-time-warning' : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
          />
        </Field>

        {/* Activates as soon as leadTime.minDays is set in src/content/site.json.
            With no number supplied we do not guess one. */}
        {tooSoon && (
          <p className={styles.warning} id="lead-time-warning" role="status">
            That is {daysUntil(eventDate)} day
            {daysUntil(eventDate) === 1 ? '' : 's'} away, and we usually need at
            least {minDays}. Send it anyway — we will tell you honestly whether
            we can fit it in.
          </p>
        )}

        <Field id="Occasion" label="What is it for">
          <select id="Occasion" name="Occasion" data-field="Occasion" defaultValue="">
            <option value="">Choose one</option>
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field id="Servings" label="How many people">
          <input
            type="text"
            id="Servings"
            name="Servings"
            data-field="Servings"
            inputMode="numeric"
            placeholder="A rough number is fine"
          />
        </Field>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>What you would like</legend>

        <Field id="Category" label="Type">
          <select
            id="Category"
            name="Category"
            data-field="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Choose one</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        {isCake && (
          <div className={styles.designerWrap}>
            <div className={styles.designerHead}>
              <h3 className={styles.designerTitle}>Design your cake</h3>
              <p className={styles.designerIntro}>
                A rough idea helps us quote accurately — sketch it here, or upload
                a photo below. Neither is required.
              </p>
            </div>
            <CakeDesigner
              design={design}
              onChange={setDesign}
              exportRef={exportRef}
            />
          </div>
        )}

        <Field
          id="What you would like"
          label="What you would like"
          error={errors['What you would like']}
          required
          hint="Flavours, colours, a theme, a photo you have seen — anything you know so far"
        >
          <textarea
            id="What you would like"
            name="What you would like"
            data-field="What you would like"
            rows={5}
            required
            aria-invalid={Boolean(errors['What you would like'])}
            aria-describedby={
              errors['What you would like'] ? 'What you would like-error' : undefined
            }
          />
        </Field>

        <Field
          id="Dietary"
          label="Allergies or dietary needs"
          hint="Tell us here rather than assuming — it changes what we can make"
        >
          <input
            type="text"
            id="Dietary"
            name="Dietary"
            data-field="Dietary"
          />
        </Field>

        <Field id="Budget" label="Rough budget" hint="So we can suggest something realistic">
          <select id="Budget" name="Budget" data-field="Budget" defaultValue="">
            <option value="">Prefer not to say</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="Notes"
          label="Anything else"
          hint="Writing on the cake, collection time, anything we should know"
        >
          <textarea
            id="Notes"
            name="Notes"
            data-field="Notes"
            rows={3}
          />
        </Field>
      </fieldset>

      <div className={styles.upload}>
        <span className={styles.uploadLabel}>Inspiration photo</span>
        <span className={styles.uploadHint}>
          Seen a cake you love? Attach a picture and we will match it.
        </span>
        <input
          type="file"
          id="inspiration"
          accept="image/jpeg,image/png,image/webp"
          className="visually-hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onInspirationChange(file)
          }}
        />
        <label htmlFor="inspiration" className={styles.uploadButton}>
          {uploading
            ? 'Uploading…'
            : inspirationUrl
              ? 'Photo attached — choose another'
              : 'Choose a photo'}
        </label>
        <span aria-live="polite" className={styles.uploadStatus}>
          {uploadError ? (
            <span className={styles.uploadError}>{uploadError}</span>
          ) : inspirationUrl ? (
            <span>Attached.</span>
          ) : null}
        </span>
      </div>

      {failure && (
        <p className={styles.failure} role="alert">
          {failure}
        </p>
      )}

      <button type="submit" className={`btn ${styles.submit}`} disabled={sending}>
        {sending ? 'Sending…' : 'Send enquiry'}
      </button>

      <p className={styles.smallprint}>
        Sending this does not book anything. We reply with a design and a price
        first.
      </p>
    </form>
  )
}

/**
 * The label's `for` must be the control's real id, not the label text — several
 * controls here are labelled "What is it for" but named "Occasion", and
 * inferring one from the other silently broke the association on five fields.
 */
function Field({
  id,
  label,
  children,
  error,
  hint,
  required,
}: {
  id: string
  label: string
  children: React.ReactNode
  error?: string
  hint?: string
  required?: boolean
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
        {required && <span className="visually-hidden"> (required)</span>}
      </label>
      {hint && <span className={styles.hint}>{hint}</span>}
      {children}
      {error && (
        <span className={styles.error} id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
