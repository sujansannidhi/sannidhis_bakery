import data from '@/content/products.json'
import site from '@/content/site.json'

export type CategoryId = 'cakes' | 'cookies' | 'cake-pops' | 'strawberries'

export type Product = {
  id: string
  sourceFile: string
  name: string
  category: CategoryId
  blurb: string
  alt: string
  featured: boolean
  image: string
  width: number
  height: number
  aspectRatio: number
  widths: number[]
  lqip: string
}

export type Category = {
  id: CategoryId
  name: string
  line: string
  cover: string
}

export const products = data.products as Product[]

export const categories = site.categories as Category[]

export function byId(id: string): Product {
  const found = products.find((p) => p.id === id)
  if (!found) {
    // Loud rather than silent: a bad id would otherwise render an empty box.
    throw new Error(`Unknown product id "${id}". Check src/content/products.json.`)
  }
  return found
}

export function byCategory(category: CategoryId): Product[] {
  return products.filter((p) => p.category === category)
}

export function featured(): Product[] {
  return products.filter((p) => p.featured)
}

export function categoryCount(category: CategoryId): number {
  return byCategory(category).length
}

/** The price slot on every case card. Quotes-only, so no number is ever shown. */
export const priceLine = site.priceLine
