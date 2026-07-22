/**
 * Step 2 of the image pipeline.
 *
 * Reads the cropped masters from assets/cropped/, emits AVIF + WebP + JPEG at
 * 480/768/1200/1600 into public/img/, and writes the measured fields back into
 * src/content/products.json — image, width, height, aspectRatio and a 20px LQIP
 * blur data-URI.
 *
 * Nothing is ever upscaled: `withoutEnlargement` means a source narrower than a
 * target width simply does not produce that derivative. The source files top out
 * at ~1840px after cropping, so the 1600 tier is the widest most of them reach.
 *
 * Editorial fields in products.json (name, category, blurb, alt, featured) are
 * preserved untouched. Run: npm run images:build
 */
import sharp from 'sharp'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'assets', 'cropped')
const OUT = path.join(ROOT, 'public', 'img')
const MANIFEST = path.join(ROOT, 'src', 'content', 'products.json')

export const WIDTHS = [480, 768, 1200, 1600]

const FORMATS = [
  { ext: 'avif', options: { quality: 55, effort: 6 } },
  { ext: 'webp', options: { quality: 76, effort: 5 } },
  { ext: 'jpg', options: { quality: 82, mozjpeg: true, progressive: true } },
]

/** A 20px-wide blurred thumbnail, inlined as a data URI for blurDataURL. */
async function makeLqip(input) {
  const buf = await sharp(input)
    .resize(20, null, { fit: 'inside' })
    .blur(1.2)
    .webp({ quality: 40 })
    .toBuffer()
  return `data:image/webp;base64,${buf.toString('base64')}`
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })

  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'))
  const emitted = []

  for (const product of manifest.products) {
    const id = path.basename(product.sourceFile, '.png')
    const input = path.join(SRC, `${id}.png`)

    try {
      await fs.access(input)
    } catch {
      throw new Error(
        `${product.id}: source "${product.sourceFile}" is not in assets/cropped/. ` +
          `Run "npm run images:crop" first.`
      )
    }

    const meta = await sharp(input).metadata()
    const widths = WIDTHS.filter((w) => w <= meta.width)
    // Always emit at least one derivative, even for a source narrower than 480.
    if (widths.length === 0) widths.push(meta.width)

    for (const width of widths) {
      for (const { ext, options } of FORMATS) {
        const dest = path.join(OUT, `${id}-${width}.${ext}`)
        await sharp(input)
          .resize({ width, withoutEnlargement: true })
          .toFormat(ext === 'jpg' ? 'jpeg' : ext, options)
          .toFile(dest)
        emitted.push(dest)
      }
    }

    product.image = `/img/${id}`
    product.width = meta.width
    product.height = meta.height
    product.aspectRatio = Number((meta.width / meta.height).toFixed(4))
    product.widths = widths
    product.lqip = await makeLqip(input)

    console.log(
      `${product.id.padEnd(24)} ${String(meta.width).padStart(4)}x${String(
        meta.height
      ).padEnd(5)} AR ${product.aspectRatio.toFixed(2)}  →  ${widths.join(', ')}`
    )
  }

  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')

  const bytes = (
    await Promise.all(emitted.map((f) => fs.stat(f).then((s) => s.size)))
  ).reduce((a, b) => a + b, 0)

  console.log(
    `\n${emitted.length} derivatives, ${(bytes / 1024 / 1024).toFixed(1)} MB total.`
  )
  console.log(`Manifest updated: ${path.relative(ROOT, MANIFEST)}`)
}

// Only build when run directly. check-images.mjs imports WIDTHS from here and
// must not trigger a rebuild as a side effect of the import.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`\n${err.message}\n`)
    process.exit(1)
  })
}
