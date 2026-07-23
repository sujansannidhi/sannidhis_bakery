'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './admin.module.css'

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/enquiries', label: 'Enquiries' },
  { href: '/admin/content', label: 'Content' },
]

export function AdminBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  // The login page renders outside the signed-in shell.
  if (pathname === '/admin/login') return null

  async function logout() {
    setLeaving(true)
    await fetch('/api/admin/logout', { method: 'POST' })
    // refresh() clears the cached server render so no admin data lingers.
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <header className={styles.bar}>
      <div className={`container ${styles.barInner}`}>
        <div>
          <Link href="/admin" className={styles.brand}>
            Sannidhi&rsquo;s Bakery
          </Link>
          <span className={styles.brandTag}>Admin</span>
        </div>

        <nav className={styles.nav} aria-label="Admin">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={styles.navLink}
              aria-current={
                href === '/admin'
                  ? pathname === '/admin'
                    ? 'page'
                    : undefined
                  : pathname.startsWith(href)
                    ? 'page'
                    : undefined
              }
            >
              {label}
            </Link>
          ))}
          <Link href="/" className={styles.navLink} target="_blank">
            View site
          </Link>
          <button
            type="button"
            className={styles.logout}
            onClick={logout}
            disabled={leaving}
          >
            {leaving ? 'Signing out…' : 'Sign out'}
          </button>
        </nav>
      </div>
    </header>
  )
}
