import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { StructuredData } from '@/components/StructuredData'

/**
 * Everything a customer sees. The route group name is in parentheses, so it
 * groups these pages without appearing in any URL — /about is still /about.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <StructuredData />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  )
}
