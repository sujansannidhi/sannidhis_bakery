'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './SiteHeader.module.css'

const NAV = [
  { href: '/menu', label: 'Menu' },
  { href: '/custom-orders', label: 'Custom orders' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [settled, setSettled] = useState(false)
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setSettled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile panel on navigation.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const current = (href: string) =>
    pathname === href ? ('page' as const) : undefined

  return (
    <header
      className={styles.header}
      data-settled={settled || open ? 'true' : 'false'}
    >
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.wordmark}>
          Sannidhi&rsquo;s Bakery
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={styles.link}
              aria-current={current(href)}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link href="/custom-orders" className={`btn ${styles.cta}`}>
          Start a custom order
        </Link>

        <button
          ref={toggleRef}
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className={`container ${styles.panel}`}>
          <nav aria-label="Primary, mobile">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={styles.panelLink}
                aria-current={current(href)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link href="/custom-orders" className={`btn ${styles.panelCta}`}>
            Start a custom order
          </Link>
        </div>
      )}
    </header>
  )
}
