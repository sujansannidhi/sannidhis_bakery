'use client'

import { useMemo, useState } from 'react'
import { Photo } from '@/components/Photo'
import { CaseCard } from '@/components/CaseCard'
import { ProductModal } from '@/components/ProductModal'
import type { Category, Product } from '@/lib/content'
import styles from './menu.module.css'

/**
 * The menu: every product, grouped by category, filterable.
 *
 * The grid is a masonry-ish column layout that takes each photograph's native
 * ratio as input — with 16 aspect ratios in the source set, a uniform card grid
 * is only achievable by cropping into the cakes.
 */
export function MenuBrowser({
  products,
  categories,
}: {
  products: Product[]
  categories: Category[]
}) {
  const [filter, setFilter] = useState<string>('all')
  const [active, setActive] = useState<Product | null>(null)

  const visible = useMemo(
    () =>
      filter === 'all' ? products : products.filter((p) => p.category === filter),
    [filter, products]
  )

  const groups = useMemo(
    () =>
      categories
        .map((c) => ({
          category: c,
          items: visible.filter((p) => p.category === c.id),
        }))
        .filter((g) => g.items.length > 0),
    [visible, categories]
  )

  return (
    <>
      <div className={styles.filters} role="group" aria-label="Filter by category">
        <button
          type="button"
          className={styles.filter}
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          Everything
          <span className={styles.filterCount}>{products.length}</span>
        </button>
        {categories.map((c) => {
          const n = products.filter((p) => p.category === c.id).length
          return (
            <button
              key={c.id}
              type="button"
              className={styles.filter}
              aria-pressed={filter === c.id}
              onClick={() => setFilter(c.id)}
            >
              {c.name}
              <span className={styles.filterCount}>{n}</span>
            </button>
          )
        })}
      </div>

      {groups.map(({ category, items }) => (
        <section key={category.id} id={category.id} className={styles.group}>
          <div className={styles.groupHead}>
            <h2 className={styles.groupTitle}>{category.name}</h2>
            <p className={styles.groupLine}>{category.line}</p>
          </div>

          <div className={styles.grid}>
            {items.map((product) => (
              <article key={product.id} className={`product ${styles.item}`}>
                <button
                  type="button"
                  className={styles.itemButton}
                  onClick={() => setActive(product)}
                >
                  <Photo
                    image={product.image}
                    alt={product.alt}
                    className={styles.itemPhoto}
                    sizes="(min-width: 1100px) 30vw, (min-width: 640px) 45vw, 100vw"
                  />
                  <CaseCard as="h3" name={product.name} blurb={product.blurb} />
                  <span className="visually-hidden">View details</span>
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}

      <ProductModal product={active} onClose={() => setActive(null)} />
    </>
  )
}
