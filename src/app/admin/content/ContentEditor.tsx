'use client'

import { useState } from 'react'
import styles from './content.module.css'

type Json = Record<string, unknown>

/**
 * Editors for the two content files.
 *
 * Deliberately field-by-field rather than a JSON textarea: the person using this
 * should never have to know what a JSON file is, and a stray comma should not be
 * able to break the site. Every value is written back into a copy of the
 * original structure, so keys the editor does not know about are preserved
 * untouched.
 *
 * Empty means null. The public pages already treat null as "not supplied yet"
 * and show an honest placeholder, so clearing a field is a valid action rather
 * than something to block.
 */

type FieldSpec = {
  path: string[]
  label: string
  hint?: string
  type?: 'text' | 'number' | 'textarea'
  placeholder?: string
}

const SITE_FIELDS: { group: string; fields: FieldSpec[] }[] = [
  {
    group: 'Where you are',
    fields: [
      {
        path: ['location', 'city'],
        label: 'City',
        hint: 'Shows in the footer, on Contact, and in the data Google reads.',
        placeholder: 'Katy',
      },
      { path: ['location', 'state'], label: 'State', placeholder: 'TX' },
      {
        path: ['location', 'serviceArea'],
        label: 'Service area',
        hint: 'How you describe the area you cover.',
        placeholder: 'Katy and west Houston',
      },
      {
        path: ['hours'],
        label: 'Hours',
        hint: 'When you answer messages, since there is no shop to visit.',
        placeholder: 'Messages answered 9am–7pm, most days',
      },
    ],
  },
  {
    group: 'Getting in touch',
    fields: [
      { path: ['contact', 'phone'], label: 'Phone', placeholder: '(281) 555-0134' },
      { path: ['contact', 'email'], label: 'Email', placeholder: 'hello@example.com' },
      { path: ['contact', 'instagram'], label: 'Instagram handle', hint: 'Without the @.' },
    ],
  },
  {
    group: 'Lead times',
    fields: [
      {
        path: ['leadTime', 'summary'],
        label: 'Lead time, in words',
        hint: 'Appears on the home page, the menu and the footer.',
        placeholder: '7 days for cakes, 3 for cookies',
      },
      {
        path: ['leadTime', 'minDays'],
        label: 'Minimum days notice',
        type: 'number',
        hint: 'A number. Setting this turns on the warning shown to anyone whose event date is sooner than this.',
        placeholder: '7',
      },
    ],
  },
  {
    group: 'Money and terms',
    fields: [
      {
        path: ['deposit'],
        label: 'Deposit',
        type: 'textarea',
        hint: 'Amount or percentage, and whether it is refundable.',
        placeholder: 'A 50% deposit reserves your date and is non-refundable within 7 days.',
      },
    ],
  },
  {
    group: 'The kitchen',
    fields: [
      {
        path: ['kitchenNote'],
        label: 'How you describe the kitchen',
        type: 'textarea',
      },
      { path: ['owner', 'name'], label: 'Baker’s name', hint: 'Leave empty to stay unnamed.' },
    ],
  },
  {
    group: 'Website',
    fields: [
      {
        path: ['domain'],
        label: 'Domain',
        hint: 'Without https://. Until this is set, the sitemap Google uses stays empty.',
        placeholder: 'sannidhisbakery.com',
      },
    ],
  },
]

function get(obj: Json, path: string[]): unknown {
  return path.reduce<unknown>(
    (acc, key) =>
      acc && typeof acc === 'object' ? (acc as Json)[key] : undefined,
    obj
  )
}

function set(obj: Json, path: string[], value: unknown): Json {
  const next = structuredClone(obj)
  let cursor: Json = next
  for (const key of path.slice(0, -1)) {
    if (typeof cursor[key] !== 'object' || cursor[key] === null) cursor[key] = {}
    cursor = cursor[key] as Json
  }
  cursor[path[path.length - 1]] = value
  return next
}

export function ContentEditor({
  site,
  products,
  canPublish,
}: {
  site: Json
  products: Json
  canPublish: boolean
}) {
  const [tab, setTab] = useState<'site' | 'products'>('site')

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label="Content sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'site'}
          className={styles.tab}
          onClick={() => setTab('site')}
        >
          Site details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'products'}
          className={styles.tab}
          onClick={() => setTab('products')}
        >
          Products
        </button>
      </div>

      {tab === 'site' ? (
        <SiteEditor initial={site} canPublish={canPublish} />
      ) : (
        <ProductsEditor initial={products} canPublish={canPublish} />
      )}
    </>
  )
}

function usePublisher(file: 'site' | 'products') {
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<
    { ok: true; unchanged?: boolean } | { ok: false; message: string } | null
  >(null)

  async function publish(data: Json) {
    setSaving(true)
    setResult(null)
    try {
      const response = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, data }),
      })
      const body = await response.json().catch(() => null)
      if (response.ok && body?.ok) {
        setResult({ ok: true, unchanged: body.unchanged })
      } else {
        setResult({ ok: false, message: body?.message ?? 'Could not publish.' })
      }
    } catch {
      setResult({ ok: false, message: 'Could not reach the server.' })
    } finally {
      setSaving(false)
    }
  }

  return { saving, result, publish }
}

function PublishBar({
  saving,
  result,
  onPublish,
  disabled,
}: {
  saving: boolean
  result: ReturnType<typeof usePublisher>['result']
  onPublish: () => void
  disabled: boolean
}) {
  return (
    <div className={styles.publishBar}>
      <button
        type="button"
        className="btn"
        onClick={onPublish}
        disabled={saving || disabled}
      >
        {saving ? 'Publishing…' : 'Publish changes'}
      </button>

      <div aria-live="polite" className={styles.publishState}>
        {saving && (
          <span>Saving to GitHub — the site rebuilds in about a minute.</span>
        )}
        {!saving && result?.ok && (
          <span className={styles.ok}>
            {result.unchanged
              ? 'Nothing had changed.'
              : 'Published. The live site updates in about a minute.'}
          </span>
        )}
        {!saving && result && !result.ok && (
          <span className={styles.error}>{result.message}</span>
        )}
      </div>
    </div>
  )
}

function SiteEditor({ initial, canPublish }: { initial: Json; canPublish: boolean }) {
  const [data, setData] = useState<Json>(initial)
  const { saving, result, publish } = usePublisher('site')

  function update(field: FieldSpec, raw: string) {
    const trimmed = raw.trim()
    let value: unknown
    if (trimmed === '') {
      value = null
    } else if (field.type === 'number') {
      const n = Number(trimmed)
      value = Number.isFinite(n) ? n : null
    } else {
      value = raw
    }
    setData((current) => set(current, field.path, value))
  }

  return (
    <>
      {SITE_FIELDS.map((group) => (
        <fieldset key={group.group} className={styles.fieldset}>
          <legend className={styles.legend}>{group.group}</legend>
          {group.fields.map((field) => {
            const id = field.path.join('.')
            const value = get(data, field.path)
            const stringValue =
              value === null || value === undefined ? '' : String(value)
            return (
              <div key={id} className={styles.field}>
                <label className={styles.label} htmlFor={id}>
                  {field.label}
                </label>
                {field.hint && <span className={styles.hint}>{field.hint}</span>}
                {field.type === 'textarea' ? (
                  <textarea
                    id={id}
                    rows={3}
                    value={stringValue}
                    placeholder={field.placeholder}
                    onChange={(e) => update(field, e.target.value)}
                  />
                ) : (
                  <input
                    id={id}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={stringValue}
                    placeholder={field.placeholder}
                    onChange={(e) => update(field, e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </fieldset>
      ))}

      <PublishBar
        saving={saving}
        result={result}
        disabled={!canPublish}
        onPublish={() => publish(data)}
      />
    </>
  )
}

type ProductRecord = {
  id: string
  name: string
  blurb: string
  alt: string
  category: string
  featured: boolean
  [key: string]: unknown
}

function ProductsEditor({
  initial,
  canPublish,
}: {
  initial: Json
  canPublish: boolean
}) {
  const [data, setData] = useState<Json>(initial)
  const { saving, result, publish } = usePublisher('products')

  const products = (data.products as ProductRecord[]) ?? []

  function updateProduct(index: number, key: string, value: unknown) {
    setData((current) => {
      const next = structuredClone(current)
      const list = next.products as ProductRecord[]
      list[index] = { ...list[index], [key]: value }
      return next
    })
  }

  return (
    <>
      <p className={styles.intro}>
        Photographs are managed on your computer, not here — see{' '}
        <code>README.md</code>. What you can change is the words that go with
        them.
      </p>

      {products.map((product, index) => (
        <fieldset key={product.id} className={styles.fieldset}>
          <legend className={styles.legend}>{product.name}</legend>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${product.id}-name`}>
              Name
            </label>
            <input
              id={`${product.id}-name`}
              type="text"
              value={product.name}
              onChange={(e) => updateProduct(index, 'name', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${product.id}-blurb`}>
              One-line description
            </label>
            <span className={styles.hint}>
              Under about 14 words, or it gets cut off on the card.
            </span>
            <textarea
              id={`${product.id}-blurb`}
              rows={2}
              value={product.blurb}
              onChange={(e) => updateProduct(index, 'blurb', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${product.id}-alt`}>
              Photo description
            </label>
            <span className={styles.hint}>
              Read aloud to blind visitors and read by Google. Describe what is
              actually in the photograph.
            </span>
            <textarea
              id={`${product.id}-alt`}
              rows={3}
              value={product.alt}
              onChange={(e) => updateProduct(index, 'alt', e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${product.id}-category`}>
                Category
              </label>
              <select
                id={`${product.id}-category`}
                value={product.category}
                onChange={(e) => updateProduct(index, 'category', e.target.value)}
              >
                <option value="cakes">Cakes</option>
                <option value="cookies">Cookies</option>
                <option value="cake-pops">Cake pops</option>
                <option value="strawberries">Chocolate-covered strawberries</option>
              </select>
            </div>

            <div className={styles.checkboxField}>
              <input
                id={`${product.id}-featured`}
                type="checkbox"
                checked={Boolean(product.featured)}
                onChange={(e) => updateProduct(index, 'featured', e.target.checked)}
              />
              <label htmlFor={`${product.id}-featured`}>
                Can appear on the home page
              </label>
            </div>
          </div>
        </fieldset>
      ))}

      <PublishBar
        saving={saving}
        result={result}
        disabled={!canPublish}
        onPublish={() => publish(data)}
      />
    </>
  )
}
