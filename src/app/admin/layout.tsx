import type { Metadata } from 'next'
import { AdminBar } from './AdminBar'
import styles from './admin.module.css'

export const metadata: Metadata = {
  title: 'Admin',
  // Belt and braces with the middleware header and robots.txt.
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Every admin route is dynamic.
 *
 * Without this, Next would try to prerender these pages at build time and the
 * resulting HTML — including whatever the dashboard displays — would sit in the
 * build output. Middleware protects requests, not build artefacts, so this is
 * the half of the story that middleware cannot cover.
 */
export const dynamic = 'force-dynamic'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.shell}>
      <AdminBar />
      <div className={styles.main}>
        <div className="container">{children}</div>
      </div>
    </div>
  )
}
