'use client'

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Milliseconds of stagger. Rows pass 60ms increments across their items. */
  delay?: number
  as?: ElementType
  className?: string
}

/**
 * 12px rise and fade, once per element, never on re-scroll.
 *
 * Applied to headings and images only — not to every element on the page. One
 * IntersectionObserver per element rather than a scroll handler, and it
 * disconnects the moment it fires. Reduced-motion users get the final state
 * immediately and no observer is created at all.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className,
}: Props) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      data-reveal={shown ? 'shown' : 'hidden'}
      style={{ transitionDelay: `${delay}ms` }}
      className={className}
    >
      {children}
    </Tag>
  )
}
