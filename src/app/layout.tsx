import type { Metadata } from 'next'
import './globals.css'
import { site } from '@/lib/site'

/**
 * The root layout is deliberately bare.
 *
 * It holds only what every route needs: the document shell, the tokens and the
 * display font. The public header, footer and structured data live in the
 * (site) group instead, because the admin area must not inherit them — a
 * customer-facing "Start a custom order" button and a marketing footer have no
 * business framing an internal tool.
 */

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
        {/*
          Only the display face is preloaded. Both faces used to be, and on a
          throttled connection they competed with the hero photograph for the
          critical path — the body face is not what the largest element is set
          in, so it can arrive on its own schedule via font-display: swap.
        */}
        <link
          rel="preload"
          href="/fonts/fraunces-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
