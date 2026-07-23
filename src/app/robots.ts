import type { MetadataRoute } from 'next'
import { site } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    // /admin is also blocked by middleware and an X-Robots-Tag header; this
    // just keeps well-behaved crawlers from knocking in the first place.
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    ...(site.domain ? { sitemap: `https://${site.domain}/sitemap.xml` } : {}),
  }
}
