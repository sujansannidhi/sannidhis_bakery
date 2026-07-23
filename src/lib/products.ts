import 'server-only'

import {
  getCategories,
  getProducts,
  productById,
  productsByCategory,
  featuredProducts,
  type Category,
  type Product,
  type ProductImage,
  type Variant,
} from './content'
import site from '@/content/site.json'

/**
 * Products and categories, read from Firestore.
 *
 * These used to be a JSON import, which meant a product could not be added and a
 * category could not be created without a code change — `CategoryId` was a union
 * of four literal strings. Both are now data.
 *
 * Site settings deliberately did NOT move. They change rarely, they benefit from
 * living in git where a bad edit can be reverted, and several client components
 * read them synchronously. Products earn a database because they change often
 * and carry uploaded photographs; business facts do not.
 *
 * Everything here is server-only. Client components receive what they need as
 * props from the server component above them.
 */

export type { Product, Category, ProductImage, Variant }

/** Kept as a name for readability; categories are now arbitrary strings. */
export type CategoryId = string

export const products = getProducts
export const categories = getCategories

export async function byId(id: string): Promise<Product> {
  const found = await productById(id)
  if (!found) {
    // Loud rather than silent: a bad id would otherwise render an empty box.
    throw new Error(`Unknown product id "${id}". Check the products collection.`)
  }
  return found
}

/** Null instead of throwing, for places where a missing product is survivable. */
export async function byIdOrNull(id: string): Promise<Product | null> {
  return productById(id)
}

export async function byCategory(category: string): Promise<Product[]> {
  return productsByCategory(category)
}

export async function featured(): Promise<Product[]> {
  return featuredProducts()
}

export async function categoryCount(category: string): Promise<number> {
  return (await productsByCategory(category)).length
}

/** The price slot on every case card. Quotes-only, so no number is ever shown. */
export const priceLine = site.priceLine
