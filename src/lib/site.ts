import raw from '@/content/site.json'

/**
 * Typed view of src/content/site.json.
 *
 * Every field that has not been supplied yet is `null` in the JSON, which
 * TypeScript would otherwise infer as the literal type `null` and narrow to
 * `never` at the first truthiness check. Declaring the shape here keeps the
 * components readable and makes "this fact may be missing" part of the type.
 */
export type Review = {
  quote: string
  name: string
  occasion?: string
}

export type ServingRow = {
  size: string
  servings: string
}

export type Site = {
  name: string
  tagline: string
  kitchen: 'home' | 'commercial' | 'retail'
  kitchenNote: string
  ordering: string
  pricing: 'quotes' | 'from'
  priceLine: string
  fulfilment: {
    pickup: boolean
    delivery: boolean
    shipping: boolean
    note: string
  }
  leadTime: {
    cakes: string | null
    cookies: string | null
    cakePops: string | null
    strawberries: string | null
    summary: string | null
  }
  contact: {
    phone: string | null
    email: string | null
    instagram: string
    instagramUrl: string
  }
  location: {
    city: string | null
    state: string
    serviceArea: string | null
  }
  hours: string | null
  dietary: string[]
  deposit: string | null
  domain: string | null
  owner: {
    name: string | null
    nameOnAboutPage: boolean | null
  }
  reviews: Review[]
  servingsGuide: ServingRow[]
  categories: { id: string; name: string; line: string; cover: string }[]
  orderSteps: { n: string; title: string; body: string }[]
}

export const site = raw as unknown as Site

/** True when we have enough of a location to state one publicly. */
export function serviceArea(): string | null {
  return (
    site.location.serviceArea ??
    (site.location.city ? `${site.location.city}, ${site.location.state}` : null)
  )
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
