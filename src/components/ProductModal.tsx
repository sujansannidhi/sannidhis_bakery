'use client'

import { useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Photo } from './Photo'
import type { Product } from '@/lib/content'
import site from '@/content/site.json'
import styles from './ProductModal.module.css'

const priceLine = site.priceLine

type Props = {
  product: Product | null
  onClose: () => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * A modal, not a route — the menu stays put behind it.
 *
 * Keyboard contract: Escape closes, Tab cycles inside the dialog and cannot
 * reach the page behind it, and focus returns to whatever opened it. The page
 * behind is marked inert so screen readers and pointer users see the same thing.
 */
export function ProductModal({ product, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  const open = product !== null

  useEffect(() => {
    if (!open) return
    restoreTo.current = document.activeElement as HTMLElement
    closeRef.current?.focus()

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflow
      restoreTo.current?.focus()
    }
  }, [open])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes || nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose]
  )

  if (!product) return null

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
      >
        <div className={styles.figure}>
          <Photo
            image={product.image}
            alt={product.alt}
            sizes="(min-width: 900px) 46vw, 92vw"
            priority
          />
        </div>

        <div className={styles.body}>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={onClose}
          >
            Close
          </button>

          <span className={styles.rule} aria-hidden="true" />
          <h2 id="product-modal-title" className={styles.title}>
            {product.name}
          </h2>
          <p className={styles.blurb}>{product.blurb}</p>
          <p className={styles.price}>{priceLine}</p>

          <p className={styles.detail}>
            {/* TODO(owner): sizes and serving counts per product. Until the
                servings guide exists this stays generic rather than guessing
                how many people a cake feeds. */}
            Sizes and servings are worked out per order. Tell us how many people
            you are feeding and we will suggest a size.
          </p>

          <Link
            href={`/custom-orders?product=${encodeURIComponent(product.id)}`}
            className={`btn ${styles.cta}`}
          >
            Request this
          </Link>
        </div>
      </div>
    </div>
  )
}
