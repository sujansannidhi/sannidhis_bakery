import { site, serviceArea } from '@/lib/site'

/**
 * Bakery JSON-LD. Local intent matters more than anything else for this
 * business, so this is worth getting right — but only with facts we actually
 * have. Anything unsupplied is omitted from the graph rather than guessed;
 * a wrong telephone or areaServed in structured data propagates into search
 * results and map cards, which is harder to undo than a wrong line of copy.
 */
export function StructuredData() {
  const area = serviceArea()

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: site.name,
    description:
      'Custom cakes, cookies, cake pops and chocolate-covered strawberries, made to order from a home kitchen.',
    sameAs: [site.contact.instagramUrl],
    priceRange: '$$',
  }

  if (site.domain) {
    data.url = `https://${site.domain}`
    data.image = `https://${site.domain}/img/photo-03-1200.jpg`
  }
  if (site.contact.phone) data.telephone = site.contact.phone
  if (site.contact.email) data.email = site.contact.email
  if (site.hours) data.openingHours = site.hours

  if (area) {
    data.areaServed = { '@type': 'Place', name: area }
  }
  if (site.location.city) {
    // A home bakery has no public street address; the locality is the useful
    // signal and the only one we can state truthfully.
    data.address = {
      '@type': 'PostalAddress',
      addressLocality: site.location.city,
      addressRegion: site.location.state,
      addressCountry: 'US',
    }
  }

  return (
    <script
      type="application/ld+json"
      // Serialised from a plain object we construct — no user input reaches this.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
