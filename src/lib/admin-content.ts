import 'server-only'

import { revalidatePath, revalidateTag } from 'next/cache'
import { db } from './firebase'
import { deletePrefix } from './storage'
import {
  CONTENT_TAG,
  type Category,
  type Product,
  type ProductImage,
  type Review,
} from './content'

/**
 * Writes to the content collections, plus the cache invalidation that makes an
 * edit show up on the public site within seconds.
 *
 * Every mutation ends with revalidateTag(CONTENT_TAG). Without it the public
 * pages would keep serving their cached copy for up to an hour and the owner
 * would reasonably conclude the save had not worked.
 */

export type ProductInput = {
  name: string
  category: string
  blurb: string
  alt: string
  featured: boolean
  order?: number
  image?: ProductImage
}

/** Every public page that renders products. */
const PUBLIC_PATHS = ['/', '/menu', '/about', '/custom-orders']

/**
 * Two invalidations, because they clear different things.
 *
 * revalidateTag drops the cached Firestore reads in content.ts — without it the
 * pages would re-render but read the same stale data. revalidatePath drops the
 * rendered HTML. Doing only one leaves the other stale, and the owner concludes
 * the save did not work.
 *
 * Next 16 requires a cache profile on revalidateTag; 'max' means expire it
 * outright rather than schedule a refresh.
 */
function refresh() {
  revalidateTag(CONTENT_TAG, 'max')
  for (const path of PUBLIC_PATHS) revalidatePath(path)
}

export async function listProducts(): Promise<Product[]> {
  const snapshot = await db().collection('products').get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function listCategories(): Promise<Category[]> {
  const snapshot = await db().collection('categories').get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Category)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function createProduct(
  id: string,
  input: ProductInput
): Promise<string> {
  const ref = db().collection('products').doc(id)
  if ((await ref.get()).exists) {
    throw new Error(`A product with the id "${id}" already exists.`)
  }

  const existing = await listProducts()
  await ref.set({
    ...input,
    order: input.order ?? existing.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  refresh()
  return id
}

export async function updateProduct(
  id: string,
  patch: Partial<ProductInput>
): Promise<void> {
  const ref = db().collection('products').doc(id)

  // Replacing a photograph orphans the old derivatives in Storage, so clean
  // them up — but only once the new ones are known good.
  if (patch.image) {
    const current = (await ref.get()).data() as Product | undefined
    const oldPrefix = current?.image?.storagePrefix
    if (oldPrefix && oldPrefix !== patch.image.storagePrefix) {
      await deletePrefix(oldPrefix)
    }
  }

  await ref.update({ ...patch, updatedAt: new Date().toISOString() })
  refresh()
}

export async function deleteProduct(id: string): Promise<void> {
  const ref = db().collection('products').doc(id)
  const current = (await ref.get()).data() as Product | undefined

  await ref.delete()

  // Uploaded files go with it. Legacy photographs in public/img are left alone —
  // they are committed to the repository and shared with nothing here.
  if (current?.image?.storagePrefix) {
    await deletePrefix(current.image.storagePrefix)
  }

  // A deleted product may have been a category's cover image.
  const categories = await listCategories()
  const orphaned = categories.filter((c) => c.cover === id)
  for (const category of orphaned) {
    await db().collection('categories').doc(category.id).update({ cover: null })
  }

  refresh()
}

export async function reorderProducts(ids: string[]): Promise<void> {
  const batch = db().batch()
  ids.forEach((id, order) => {
    batch.update(db().collection('products').doc(id), { order })
  })
  await batch.commit()
  refresh()
}

export async function upsertCategory(
  id: string,
  input: { name: string; line: string; cover?: string | null; order?: number }
): Promise<void> {
  const existing = await listCategories()
  const known = existing.find((c) => c.id === id)

  await db()
    .collection('categories')
    .doc(id)
    .set(
      {
        name: input.name,
        line: input.line,
        cover: input.cover ?? known?.cover ?? null,
        order: input.order ?? known?.order ?? existing.length,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )
  refresh()
}

export async function deleteCategory(id: string): Promise<void> {
  const products = await listProducts()
  const inUse = products.filter((p) => p.category === id)
  if (inUse.length > 0) {
    // Deleting the section would leave these products invisible on the menu
    // without saying so. Refusing is kinder than silently orphaning them.
    throw new Error(
      `${inUse.length} product${inUse.length === 1 ? ' is' : 's are'} still in that section. Move them first.`
    )
  }
  await db().collection('categories').doc(id).delete()
  refresh()
}

/* ── Reviews ──────────────────────────────────────────────────────────────── */

export type ReviewInput = {
  quote: string
  name: string
  occasion?: string
  order?: number
}

export async function listReviews(): Promise<Review[]> {
  const snapshot = await db().collection('reviews').get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Review)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function createReview(input: ReviewInput): Promise<string> {
  const existing = await listReviews()
  const ref = await db().collection('reviews').add({
    quote: input.quote,
    name: input.name,
    occasion: input.occasion ?? '',
    order: input.order ?? existing.length,
    createdAt: new Date().toISOString(),
  })
  refresh()
  return ref.id
}

export async function updateReview(
  id: string,
  patch: Partial<ReviewInput>
): Promise<void> {
  await db().collection('reviews').doc(id).update({ ...patch })
  refresh()
}

export async function deleteReview(id: string): Promise<void> {
  await db().collection('reviews').doc(id).delete()
  refresh()
}
