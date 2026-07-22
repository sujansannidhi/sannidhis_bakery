/**
 * Build gate. Wired into `prebuild`, so a broken image reference fails the build
 * rather than shipping.
 *
 * Checks, in order:
 *   a. every derivative the manifest claims exists on disk
 *   b. no derivative is wider than the cropped source it came from
 *   c. every /img/ reference hard-coded in src/ resolves to a real file
 *   d. no banned stock-photo or placeholder host appears anywhere in src/
 *   e. reports any source photo in assets/ that no product uses
 *
 * Run: npm run check:images
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WIDTHS } from './build-images.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC_PHOTOS = path.join(ROOT, 'assets', 'bakery-photos')
const CROPPED = path.join(ROOT, 'assets', 'cropped')
const IMG = path.join(ROOT, 'public', 'img')
const SRC = path.join(ROOT, 'src')
const MANIFEST = path.join(ROOT, 'src', 'content', 'products.json')

const EXTS = ['avif', 'webp', 'jpg']

/** Hosts and patterns that must never appear. Every photo is the client's own. */
const BANNED = [
  'unsplash',
  'pexels',
  'pixabay',
  'placeholder.com',
  'via.placeholder',
  'picsum',
  'lorempixel',
  'placehold.it',
  'placehold.co',
  'cloudinary.com/demo',
  'dummyimage',
]

const errors = []
const warnings = []

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function walk(dir) {
  const out = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'))
  const products = manifest.products
  const usedSources = new Set()

  // ── a + b ──────────────────────────────────────────────────────────────
  for (const p of products) {
    usedSources.add(p.sourceFile)

    if (!p.image || !p.width || !p.height) {
      errors.push(
        `${p.id}: manifest has no measured fields. Run "npm run images:build".`
      )
      continue
    }

    const croppedSource = path.join(CROPPED, p.sourceFile)
    if (!(await exists(croppedSource))) {
      errors.push(`${p.id}: cropped source missing — ${p.sourceFile}`)
    }

    for (const w of p.widths ?? []) {
      if (w > p.width) {
        errors.push(
          `${p.id}: derivative ${w}px is wider than its ${p.width}px source — ` +
            `that is an upscale.`
        )
      }
      for (const ext of EXTS) {
        const file = path.join(IMG, `${path.basename(p.image)}-${w}.${ext}`)
        if (!(await exists(file))) {
          errors.push(`${p.id}: missing derivative ${path.relative(ROOT, file)}`)
        }
      }
    }

    const overshoot = (p.widths ?? []).length === 0
    if (overshoot) errors.push(`${p.id}: no derivatives generated at all.`)
  }

  // ── c + d ──────────────────────────────────────────────────────────────
  if (await exists(SRC)) {
    const files = (await walk(SRC)).filter((f) =>
      /\.(tsx?|jsx?|css|json|md)$/.test(f)
    )
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8')
      const rel = path.relative(ROOT, file)

      for (const bad of BANNED) {
        if (text.toLowerCase().includes(bad)) {
          errors.push(`${rel}: references a banned image source — "${bad}"`)
        }
      }

      if (file === MANIFEST) continue
      for (const m of text.matchAll(/["'`](\/img\/[a-z0-9\-/.]+)["'`]/gi)) {
        const ref = m[1]
        // Bare stems like "/img/photo-03" are resolved by the picture component
        // into per-width derivatives; check the stem has at least one file.
        const hasExt = /\.(avif|webp|jpg|jpeg|png)$/i.test(ref)
        if (hasExt) {
          if (!(await exists(path.join(ROOT, 'public', ref)))) {
            errors.push(`${rel}: references ${ref}, which is not on disk`)
          }
        } else {
          const stem = path.basename(ref)
          const any = await Promise.all(
            WIDTHS.map((w) => exists(path.join(IMG, `${stem}-${w}.webp`)))
          )
          if (!any.some(Boolean)) {
            errors.push(`${rel}: references ${ref}, which has no derivatives`)
          }
        }
      }
    }
  }

  // ── e ──────────────────────────────────────────────────────────────────
  if (await exists(SRC_PHOTOS)) {
    const all = (await fs.readdir(SRC_PHOTOS)).filter((f) => f.endsWith('.png'))
    const unused = all.filter((f) => !usedSources.has(f)).sort()
    if (unused.length) {
      warnings.push(
        `${unused.length} source photo(s) never used on the site: ${unused.join(', ')}`
      )
    }
  }

  // ── report ─────────────────────────────────────────────────────────────
  for (const w of warnings) console.warn(`  warn  ${w}`)
  for (const e of errors) console.error(`  FAIL  ${e}`)

  if (errors.length) {
    console.error(`\ncheck:images failed with ${errors.length} error(s).\n`)
    process.exit(1)
  }
  console.log(
    `\ncheck:images passed — ${products.length} products, ` +
      `${products.reduce((n, p) => n + (p.widths?.length ?? 0) * EXTS.length, 0)} derivatives verified.` +
      (warnings.length ? ` ${warnings.length} warning(s).` : '')
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
