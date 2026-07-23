import 'server-only'
import { unstable_cache } from 'next/cache'

import { db, isFirebaseConfigured } from './firebase'
import seedProducts from '@/content/products.json'
import seedSite from '@/content/site.json'

/**
 * The content layer.
 *
 * Products, categories and site settings used to be JSON files read at build
 * time. They now live in Firestore so the owner can add a product, add a section
 * and upload a photograph without a developer or a rebuild.
 *
 * The public pages stay fast because reads go through `unstable_cache` and the
 * admin calls `revalidateTag` after every write. Pages are served from the cache
 * — they are not hitting Firestore per request — but an edit shows up within
 * seconds rather than the minute a rebuild used to take.
 *
 * If Firebase is unreachable or not configured, every read falls back to the
 * JSON files still committed in src/content/. The public site therefore cannot
 * be taken down by a database problem; it just shows the last committed content.
 */

export const CONTENT_TAG = 'content'

/** One rendition of a photograph at one width. */
export type Variant = {
  width: number
  avif?: string
  webp?: string
  jpg: string
}

export type ProductImage = {
  variants: Variant[]
  width: number
  height: number
  aspectRatio: number
  lqip: string
  /** Set for the original 21, which are served from public/img rather than Storage. */
  legacyStem?: string
  /** Storage path prefix, so a replaced photo can clean up after itself. */
  storagePrefix?: string
}

export type Product = {
  id: string
  name: string
  category: string
  blurb: string
  alt: string
  featured: boolean
  order: number
  image: ProductImage
}

export type Category = {
  id: string
  name: string
  line: string
  cover: string | null
  order: number
}

/* ── Reads ────────────────────────────────────────────────────────────────── */

async function fetchProducts(): Promise<Product[]> {
  if (!isFirebaseConfigured()) return seedProductList()
  try {
    const snapshot = await db().collection('products').get()
    if (snapshot.empty) return seedProductList()
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  } catch (error) {
    console.error('[content] products read failed, using committed seed:', message(error))
    return seedProductList()
  }
}

async function fetchCategories(): Promise<Category[]> {
  if (!isFirebaseConfigured()) return seedCategoryList()
  try {
    const snapshot = await db().collection('categories').get()
    if (snapshot.empty) return seedCategoryList()
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Category)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  } catch (error) {
    console.error('[content] categories read failed, using committed seed:', message(error))
    return seedCategoryList()
  }
}

async function fetchSettings(): Promise<Record<string, unknown>> {
  if (!isFirebaseConfigured()) return seedSite as Record<string, unknown>
  try {
    const doc = await db().collection('settings').doc('site').get()
    if (!doc.exists) return seedSite as Record<string, unknown>
    return doc.data() as Record<string, unknown>
  } catch (error) {
    console.error('[content] settings read failed, using committed seed:', message(error))
    return seedSite as Record<string, unknown>
  }
}

/*
  Cached wrappers. The cache is keyed and tagged so a single revalidateTag call
  from the admin invalidates products, categories and settings together — they
  are edited together and a partial refresh would show an inconsistent page.
*/
export const getProducts = unstable_cache(fetchProducts, ['products'], {
  tags: [CONTENT_TAG],
  revalidate: 3600,
})

export const getCategories = unstable_cache(fetchCategories, ['categories'], {
  tags: [CONTENT_TAG],
  revalidate: 3600,
})

export const getSettings = unstable_cache(fetchSettings, ['settings'], {
  tags: [CONTENT_TAG],
  revalidate: 3600,
})

/* ── Helpers used by the public pages ─────────────────────────────────────── */

export async function productById(id: string): Promise<Product | null> {
  const all = await getProducts()
  return all.find((p) => p.id === id) ?? null
}

export async function productsByCategory(category: string): Promise<Product[]> {
  const all = await getProducts()
  return all.filter((p) => p.category === category)
}

export async function featuredProducts(): Promise<Product[]> {
  const all = await getProducts()
  return all.filter((p) => p.featured)
}

/* ── Seed fallback ────────────────────────────────────────────────────────── */

/**
 * Turns the committed products.json into the new shape.
 *
 * The original 21 photographs are already sitting in public/img as derivatives,
 * so their variants are constructed from the naming convention rather than
 * re-encoded or re-uploaded.
 */
function seedProductList(): Product[] {
  return (seedProducts.products as SeedProduct[]).map((p, index) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    blurb: p.blurb,
    alt: p.alt,
    featured: p.featured,
    order: index,
    image: legacyImage(p),
  }))
}

function seedCategoryList(): Category[] {
  return (seedSite.categories as SeedCategory[]).map((c, index) => ({
    id: c.id,
    name: c.name,
    line: c.line,
    cover: c.cover,
    order: index,
  }))
}

type SeedProduct = {
  id: string
  name: string
  category: string
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

type SeedCategory = { id: string; name: string; line: string; cover: string }

/** Build a ProductImage for one of the original photographs in public/img. */
export function legacyImage(p: SeedProduct): ProductImage {
  return {
    variants: p.widths.map((width) => ({
      width,
      avif: `${p.image}-${width}.avif`,
      webp: `${p.image}-${width}.webp`,
      jpg: `${p.image}-${width}.jpg`,
    })),
    width: p.width,
    height: p.height,
    aspectRatio: p.aspectRatio,
    lqip: p.lqip,
    legacyStem: p.image,
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
