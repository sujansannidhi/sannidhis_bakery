import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { site } from '@/lib/site'

// TODO(owner): set the domain in src/content/site.json so canonical URLs, the
// sitemap and OG tags point at the real site.
const base = site.domain ? `https://${site.domain}` : undefined

export const metadata: Metadata = {
  metadataBase: base ? new URL(base) : undefined,
  title: {
    default: "Sannidhi's Bakery — custom cakes, cookies and cake pops",
    template: "%s — Sannidhi's Bakery",
  },
  description:
    'Custom cakes, cookies, cake pops and chocolate-covered strawberries, made to order from our home kitchen in Texas. Pickup only.',
  openGraph: {
    type: 'website',
    siteName: "Sannidhi's Bakery",
    images: ['/img/photo-03-1200.jpg'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* The hero photograph and the display face are both on the LCP path. */}
        <link
          rel="preload"
          href="/fonts/fraunces-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/schibsted-grotesk-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
