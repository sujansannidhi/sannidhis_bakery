/**
 * One-off: move products, categories and site settings into Firestore.
 *
 * The 21 original photographs are NOT re-uploaded. They are already sitting in
 * public/img as derivatives and keep being served from there — each product's
 * variants are constructed from the existing naming convention, so this is a
 * data migration, not an image migration.
 *
 * Safe to run more than once. Existing documents are overwritten with what is in
 * the JSON files, so it doubles as "reset content back to the committed seed".
 * Pass --dry to see what it would do without writing.
 *
 *   npm run migrate:content
 *   npm run migrate:content -- --dry
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DRY = process.argv.includes('--dry')

async function loadEnvLocal() {
  try {
    const text = await fs.readFile(path.join(ROOT, '.env.local'), 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    /* fall through to the ambient environment */
  }
}

function variantsFor(product) {
  return product.widths.map((width) => ({
    width,
    avif: `${product.image}-${width}.avif`,
    webp: `${product.image}-${width}.webp`,
    jpg: `${product.image}-${width}.jpg`,
  }))
}

async function main() {
  await loadEnvLocal()

  const missing = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ].filter((name) => !process.env[name])
  if (missing.length) {
    console.error(`\nMissing: ${missing.join(', ')}\nRun npm run check:env.\n`)
    process.exit(1)
  }

  const products = JSON.parse(
    await fs.readFile(path.join(ROOT, 'src/content/products.json'), 'utf8')
  ).products
  const site = JSON.parse(
    await fs.readFile(path.join(ROOT, 'src/content/site.json'), 'utf8')
  )

  const { cert, getApps, initializeApp } = await import('firebase-admin/app')
  const { getFirestore } = await import('firebase-admin/firestore')

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      })
  const store = getFirestore(app)
  store.settings({ ignoreUndefinedProperties: true })

  console.log(DRY ? '\nDRY RUN — nothing will be written\n' : '')

  // ── Products ────────────────────────────────────────────────────────────
  let batch = store.batch()
  products.forEach((p, index) => {
    const doc = {
      name: p.name,
      category: p.category,
      blurb: p.blurb,
      alt: p.alt,
      featured: Boolean(p.featured),
      order: index,
      image: {
        variants: variantsFor(p),
        width: p.width,
        height: p.height,
        aspectRatio: p.aspectRatio,
        lqip: p.lqip,
        legacyStem: p.image,
      },
      updatedAt: new Date().toISOString(),
    }
    if (!DRY) batch.set(store.collection('products').doc(p.id), doc)
  })
  if (!DRY) await batch.commit()
  console.log(`  products    ${products.length} written`)

  // ── Categories ──────────────────────────────────────────────────────────
  batch = store.batch()
  site.categories.forEach((c, index) => {
    const doc = {
      name: c.name,
      line: c.line,
      cover: c.cover ?? null,
      order: index,
      updatedAt: new Date().toISOString(),
    }
    if (!DRY) batch.set(store.collection('categories').doc(c.id), doc)
  })
  if (!DRY) await batch.commit()
  console.log(`  categories  ${site.categories.length} written`)

  // ── Settings ────────────────────────────────────────────────────────────
  // categories live in their own collection now; everything else moves across
  // unchanged so the existing site.ts shape keeps working.
  const settings = { ...site }
  delete settings.categories
  delete settings._comment
  if (!DRY) {
    await store
      .collection('settings')
      .doc('site')
      .set({ ...settings, updatedAt: new Date().toISOString() })
  }
  console.log(`  settings    1 document written`)

  console.log(
    DRY
      ? '\nDry run complete.\n'
      : '\nDone. The admin now edits Firestore; the JSON files remain as the fallback seed.\n'
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
