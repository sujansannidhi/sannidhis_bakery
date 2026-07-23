'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Category, Product, ProductImage } from '@/lib/content'
import { PhotoPicker } from './PhotoPicker'
import styles from './menu.module.css'
import admin from '../admin.module.css'

/**
 * The menu editor.
 *
 * Products are cards showing their actual photograph rather than rows in a form.
 * The first version of this listed 21 fieldsets in one column, which was
 * technically complete and practically unusable — you could not find the cake
 * you meant to edit without scrolling past twenty others.
 */

type Draft = {
  name: string
  category: string
  blurb: string
  alt: string
  featured: boolean
}

export function MenuEditor({
  initialProducts,
  initialCategories,
  storageReady,
}: {
  initialProducts: Product[]
  initialCategories: Category[]
  storageReady: boolean
}) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [categories, setCategories] = useState(initialCategories)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visible =
    filter === 'all' ? products : products.filter((p) => p.category === filter)

  const editingProduct = products.find((p) => p.id === editing) ?? null

  async function refresh() {
    const [p, c] = await Promise.all([
      fetch('/api/admin/products').then((r) => r.json()),
      fetch('/api/admin/categories').then((r) => r.json()),
    ])
    if (p?.ok) setProducts(p.products)
    if (c?.ok) setCategories(c.categories)
    router.refresh()
  }

  async function call(
    url: string,
    options: RequestInit,
    successMessage: string
  ): Promise<boolean> {
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.ok) {
        throw new Error(body?.message ?? 'That did not save.')
      }
      setNotice(successMessage)
      await refresh()
      return true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not save.')
      return false
    }
  }

  return (
    <>
      <div className={admin.pageHead}>
        <h1 className={admin.pageTitle}>Menu</h1>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setAdding(true)
            setEditing(null)
          }}
        >
          Add a product
        </button>
      </div>

      {!storageReady && (
        <div className={admin.notice}>
          <h2>Photo uploads are not available</h2>
          <p>Firebase is not connected, so new photographs cannot be stored.</p>
        </div>
      )}

      <div aria-live="polite" className={styles.banner}>
        {error && <p className={styles.error}>{error}</p>}
        {notice && !error && <p className={styles.ok}>{notice}</p>}
      </div>

      <Sections
        categories={categories}
        products={products}
        onSave={(id, body) =>
          call(
            '/api/admin/categories',
            { method: 'POST', body: JSON.stringify(body) },
            'Section saved. The live site updates in a few seconds.'
          )
        }
        onDelete={(id) =>
          call(
            '/api/admin/categories',
            { method: 'DELETE', body: JSON.stringify({ id }) },
            'Section removed.'
          )
        }
      />

      <div className={styles.toolbar}>
        <div className={admin.filters}>
          <button
            type="button"
            className={admin.filter}
            aria-current={filter === 'all' ? 'true' : undefined}
            onClick={() => setFilter('all')}
          >
            All <span>{products.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={admin.filter}
              aria-current={filter === c.id ? 'true' : undefined}
              onClick={() => setFilter(c.id)}
            >
              {c.name}{' '}
              <span>{products.filter((p) => p.category === c.id).length}</span>
            </button>
          ))}
        </div>
      </div>

      {adding && (
        <ProductForm
          heading="New product"
          categories={categories}
          storageReady={storageReady}
          onCancel={() => setAdding(false)}
          onSubmit={async (draft, image) => {
            if (!image) {
              setError('A product needs a photograph.')
              return
            }
            const ok = await call(
              '/api/admin/products',
              { method: 'POST', body: JSON.stringify({ ...draft, image }) },
              'Product added. The live site updates in a few seconds.'
            )
            if (ok) setAdding(false)
          }}
        />
      )}

      {/*
        The edit form sits above the grid at full width, not inside the card.
        Rendering it in place put it in a one-third-width grid column, which
        squeezed every label and field into a narrow vertical ribbon.
      */}
      {editingProduct && (
        <ProductForm
          key={editingProduct.id}
          heading={`Editing ${editingProduct.name}`}
          categories={categories}
          storageReady={storageReady}
          initial={{
            name: editingProduct.name,
            category: editingProduct.category,
            blurb: editingProduct.blurb,
            alt: editingProduct.alt,
            featured: editingProduct.featured,
          }}
          currentThumb={thumbOf(editingProduct)}
          onCancel={() => setEditing(null)}
          onSubmit={async (draft, image) => {
            const body: Record<string, unknown> = { ...draft }
            if (image) body.image = image
            const ok = await call(
              `/api/admin/products/${editingProduct.id}`,
              { method: 'PATCH', body: JSON.stringify(body) },
              'Saved. The live site updates in a few seconds.'
            )
            if (ok) setEditing(null)
          }}
          onDelete={async () => {
            await call(
              `/api/admin/products/${editingProduct.id}`,
              { method: 'DELETE' },
              'Product removed from the site.'
            )
            setEditing(null)
          }}
        />
      )}

      <div className={styles.grid}>
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            categories={categories}
            isEditing={editing === product.id}
            onEdit={() => {
              setEditing(product.id)
              setAdding(false)
              // The form appears above the grid, so bring it into view.
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        ))}
      </div>

      {visible.length === 0 && (
        <p className={admin.empty}>Nothing in that section yet.</p>
      )}
    </>
  )
}

/* ── Sections ─────────────────────────────────────────────────────────────── */

function Sections({
  categories,
  products,
  onSave,
  onDelete,
}: {
  categories: Category[]
  products: Product[]
  onSave: (id: string, body: Record<string, unknown>) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLine, setNewLine] = useState('')

  return (
    <section className={styles.sections}>
      <button
        type="button"
        className={styles.sectionsToggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Sections ({categories.length}) <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className={styles.sectionsBody}>
          {categories.map((category) => (
            <SectionRow
              key={category.id}
              category={category}
              products={products}
              onSave={onSave}
              onDelete={onDelete}
            />
          ))}

          <div className={styles.newSection}>
            <h3 className={styles.subheading}>Add a section</h3>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-section-name">
                Name
              </label>
              <input
                id="new-section-name"
                type="text"
                value={newName}
                placeholder="Cupcakes"
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-section-line">
                One line about it
              </label>
              <input
                id="new-section-line"
                type="text"
                value={newLine}
                placeholder="Baked fresh, iced to order."
                onChange={(e) => setNewLine(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn"
              disabled={!newName.trim()}
              onClick={async () => {
                const ok = await onSave('', { name: newName, line: newLine })
                if (ok) {
                  setNewName('')
                  setNewLine('')
                }
              }}
            >
              Add section
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function SectionRow({
  category,
  products,
  onSave,
  onDelete,
}: {
  category: Category
  products: Product[]
  onSave: (id: string, body: Record<string, unknown>) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}) {
  const [name, setName] = useState(category.name)
  const [line, setLine] = useState(category.line)
  const [cover, setCover] = useState(category.cover ?? '')
  const inSection = products.filter((p) => p.category === category.id)
  const dirty =
    name !== category.name ||
    line !== category.line ||
    cover !== (category.cover ?? '')

  return (
    <div className={styles.sectionRow}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`sec-name-${category.id}`}>
          Name
        </label>
        <input
          id={`sec-name-${category.id}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`sec-line-${category.id}`}>
          One line
        </label>
        <input
          id={`sec-line-${category.id}`}
          type="text"
          value={line}
          onChange={(e) => setLine(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`sec-cover-${category.id}`}>
          Cover photo
        </label>
        <select
          id={`sec-cover-${category.id}`}
          value={cover}
          onChange={(e) => setCover(e.target.value)}
        >
          <option value="">None</option>
          {inSection.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.sectionActions}>
        <button
          type="button"
          className="btn"
          disabled={!dirty}
          onClick={() =>
            onSave(category.id, {
              id: category.id,
              name,
              line,
              cover: cover || null,
            })
          }
        >
          Save
        </button>
        <button
          type="button"
          className={styles.danger}
          onClick={() => {
            if (
              confirm(
                `Remove the "${category.name}" section? Products in it must be moved first.`
              )
            ) {
              onDelete(category.id)
            }
          }}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

/* ── Product card ─────────────────────────────────────────────────────────── */

function thumbOf(product: Product): string | null {
  return (
    [...(product.image?.variants ?? [])].sort((a, b) => a.width - b.width)[0]
      ?.jpg ?? null
  )
}

function ProductCard({
  product,
  categories,
  isEditing,
  onEdit,
}: {
  product: Product
  categories: Category[]
  isEditing: boolean
  onEdit: () => void
}) {
  const thumb = thumbOf(product)

  return (
    <article className={styles.card} data-editing={isEditing || undefined}>
      {thumb && (
        // A plain img: this is a thumbnail in a private tool, so the derivative
        // machinery the public site uses would be overkill.
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.cardPhoto} src={thumb} alt="" loading="lazy" />
      )}
      <div className={styles.cardBody}>
        <h2 className={styles.cardName}>{product.name}</h2>
        <p className={styles.cardBlurb}>{product.blurb || <em>No description</em>}</p>
        <p className={styles.cardMeta}>
          {categories.find((c) => c.id === product.category)?.name ??
            product.category}
          {product.featured && ' · on the home page'}
        </p>
        <button type="button" className={styles.cardEdit} onClick={onEdit}>
          {isEditing ? 'Editing above' : 'Edit'}
        </button>
      </div>
    </article>
  )
}

/* ── Product form ─────────────────────────────────────────────────────────── */

function ProductForm({
  heading,
  categories,
  storageReady,
  initial,
  currentThumb,
  onCancel,
  onSubmit,
  onDelete,
}: {
  heading: string
  categories: Category[]
  storageReady: boolean
  initial?: Draft
  currentThumb?: string | null
  onCancel: () => void
  onSubmit: (draft: Draft, image: ProductImage | null) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>(
    initial ?? {
      name: '',
      category: categories[0]?.id ?? '',
      blurb: '',
      alt: '',
      featured: false,
    }
  )
  const [image, setImage] = useState<ProductImage | null>(null)
  const [saving, setSaving] = useState(false)

  const preview =
    [...(image?.variants ?? [])].sort((a, b) => a.width - b.width)[0]?.jpg ??
    currentThumb ??
    null

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  return (
    <form
      className={styles.form}
      onSubmit={async (event) => {
        event.preventDefault()
        setSaving(true)
        await onSubmit(draft, image)
        setSaving(false)
      }}
    >
      <h2 className={styles.formHeading}>{heading}</h2>

      <div className={styles.formGrid}>
        <div className={styles.formPhoto}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className={styles.preview} />
          ) : (
            <div className={styles.previewEmpty}>No photo yet</div>
          )}
          <PhotoPicker
            label={currentThumb ? 'Replace photo' : 'Choose a photo'}
            name={draft.name || 'product'}
            disabled={!storageReady}
            onUploaded={setImage}
          />
        </div>

        <div className={styles.formFields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="p-name">
              Name
            </label>
            <input
              id="p-name"
              type="text"
              required
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label className={styles.label} htmlFor="p-blurb">
              One-line description
            </label>
            <span className={styles.hint}>
              Shows under the name on the menu. Keep it under 14 words or it gets
              cut off.
            </span>
            <textarea
              id="p-blurb"
              rows={2}
              value={draft.blurb}
              onChange={(e) => set('blurb', e.target.value)}
            />
            <span
              className={styles.charCount}
              data-over={draft.blurb.trim().split(/\s+/).filter(Boolean).length > 14}
            >
              {draft.blurb.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label className={styles.label} htmlFor="p-alt">
              Photo description
            </label>
            <span className={styles.hint}>
              Read aloud to blind visitors and read by Google. Describe what is
              actually in the photograph.
            </span>
            <textarea
              id="p-alt"
              rows={3}
              value={draft.alt}
              onChange={(e) => set('alt', e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="p-category">
              Section
            </label>
            <select
              id="p-category"
              value={draft.category}
              onChange={(e) => set('category', e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.checkbox}>
            <input
              id="p-featured"
              type="checkbox"
              checked={draft.featured}
              onChange={(e) => set('featured', e.target.checked)}
            />
            <label htmlFor="p-featured">Can appear on the home page</label>
          </div>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className="btn" disabled={saving || !draft.name.trim()}>
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
              if (
                confirm(
                  `Remove "${draft.name}" from the site? This cannot be undone.`
                )
              ) {
                onDelete()
              }
            }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
