import type { MetadataRoute } from 'next'
import { site } from '@/lib/site'

const ROUTES = ['', '/menu', '/custom-orders', '/about', '/contact']

/**
 * A sitemap needs absolute URLs, so it can only be generated once the domain is
 * known. Until then this is deliberately empty rather than pointing at a guessed
 * host. TODO(owner): set `domain` in src/content/site.json.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!site.domain) return []

  const base = `https://${site.domain}`
  return ROUTES.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date('2026-07-22'),
    changeFrequency: route === '' ? ('weekly' as const) : ('monthly' as const),
    priority: route === '' ? 1 : route === '/custom-orders' ? 0.9 : 0.7,
  }))
}
