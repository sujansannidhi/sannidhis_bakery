/**
 * Step 1 of the image pipeline.
 *
 * The source files are Instagram screenshots, not photographs. Every one of them
 * carries some amount of app or browser chrome baked into the crop: flat letterbox
 * bands top and bottom, and on several files a strip of Instagram UI (carousel
 * arrows, like/comment icons) down the right edge. Three of them have the owner's
 * browser bookmarks bar in the top band, with personal bookmark names in it.
 *
 * This script finds those bands by scanning inward from each edge for rows/columns
 * whose pixel standard deviation is below a threshold, and cuts them off. It writes
 * cropped masters to assets/cropped/ and never touches assets/bakery-photos/.
 *
 * Run: npm run images:crop
 */
import sharp from 'sharp'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'assets', 'bakery-photos')
const OUT = path.join(ROOT, 'assets', 'cropped')

/** A row/column is "flat" below this std-dev. */
const FLAT_STDDEV = 6
/**
 * A near-black line this dark, with no more variation than this, is a dark band.
 * Kept deliberately tight: dark *content* — a slate worktop, a wooden table, a
 * shaded fence — sits around luma 40-70 and must not be mistaken for chrome.
 */
const DARK_BAND_LUMA = 14
const DARK_BAND_STDDEV = 9
/** Never eat more than this fraction of a dimension, however flat it looks. */
const MAX_TRIM_FRACTION = 0.14
/** Extra pixels shaved past the detected band, to catch anti-aliased boundaries. */
const OVERSHOOT = 2

/**
 * Manual overrides. Detection handles the flat letterbox bands well, but some
 * chrome is not flat: Instagram's right-edge UI sits on top of the photo itself,
 * and the bookmarks bars are textured with text. These were measured by eye from
 * the source files. Values are pixels to remove from each named edge.
 */
const MANUAL = {
  // Browser bookmarks bar with personal bookmark names in the top band.
  'photo-12': { top: 150, bottom: 150 },
  'photo-13': { top: 95, right: 45, bottom: 20 },
  'photo-21': { top: 82, right: 44, bottom: 24 },
  // Instagram carousel arrow / action icons on the right edge.
  'photo-05': { right: 48 },
  'photo-07': { right: 88 },
  'photo-09': { right: 44 },
  'photo-10': { top: 20, bottom: 20 },
  'photo-16': { right: 34, top: 20, bottom: 14 },
  'photo-17': { right: 100, top: 52, bottom: 24 },
  'photo-18': { top: 88, right: 44 },
  // Heavy app chrome, measured by eye.
  'photo-11': { top: 145, bottom: 70 },
  'photo-15': { top: 80, bottom: 110 },
  'photo-20': { top: 125, bottom: 75 },
}

/**
 * Scan inward from one edge, counting consecutive flat lines.
 * @param {{data: Buffer, width: number, height: number, channels: number}} raw
 * @param {'top'|'bottom'|'left'|'right'} edge
 */
function detectBand(raw, edge) {
  const { data, width, height, channels } = raw
  const vertical = edge === 'top' || edge === 'bottom'
  const lineCount = vertical ? height : width
  const lineLength = vertical ? width : height
  const limit = Math.floor(lineCount * MAX_TRIM_FRACTION)

  const lumaAt = (x, y) => {
    const i = (y * width + x) * channels
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  let band = 0
  for (let step = 0; step < limit; step++) {
    const idx =
      edge === 'top' || edge === 'left' ? step : lineCount - 1 - step

    // Sample the line rather than reading every pixel — plenty for a flatness test.
    const stride = Math.max(1, Math.floor(lineLength / 256))
    let n = 0
    let sum = 0
    let sumSq = 0
    for (let p = 0; p < lineLength; p += stride) {
      const v = vertical ? lumaAt(p, idx) : lumaAt(idx, p)
      sum += v
      sumSq += v * v
      n++
    }
    const mean = sum / n
    const stdDev = Math.sqrt(Math.max(0, sumSq / n - mean * mean))

    // Two kinds of chrome. A truly flat line is letterboxing. A near-black line
    // with a little noise in it is a screenshot's dark band, which JPEG artefacts
    // keep from ever being perfectly flat.
    const isFlat = stdDev < FLAT_STDDEV
    const isDarkBand = mean < DARK_BAND_LUMA && stdDev < DARK_BAND_STDDEV

    if (isFlat || isDarkBand) band = step + 1
    else break
  }

  return band > 0 ? Math.min(band + OVERSHOOT, limit) : 0
}

async function main() {
  await fs.mkdir(OUT, { recursive: true })
  const files = (await fs.readdir(SRC)).filter((f) => f.endsWith('.png')).sort()

  const report = []

  for (const file of files) {
    const id = path.basename(file, '.png')
    const input = path.join(SRC, file)
    const image = sharp(input)
    const meta = await image.metadata()
    const raw = await image
      .clone()
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const detected = {
      top: detectBand(raw.info ? { ...raw.info, data: raw.data } : raw, 'top'),
      bottom: detectBand({ ...raw.info, data: raw.data }, 'bottom'),
      left: detectBand({ ...raw.info, data: raw.data }, 'left'),
      right: detectBand({ ...raw.info, data: raw.data }, 'right'),
    }

    const manual = MANUAL[id] ?? {}
    // Take whichever is larger per edge — detection catches flat letterboxing,
    // the manual table catches textured chrome that detection cannot see.
    const trim = {
      top: Math.max(detected.top, manual.top ?? 0),
      bottom: Math.max(detected.bottom, manual.bottom ?? 0),
      left: Math.max(detected.left, manual.left ?? 0),
      right: Math.max(detected.right, manual.right ?? 0),
    }

    const width = meta.width - trim.left - trim.right
    const height = meta.height - trim.top - trim.bottom

    await sharp(input)
      .extract({ left: trim.left, top: trim.top, width, height })
      .png({ compressionLevel: 6 })
      .toFile(path.join(OUT, `${id}.png`))

    report.push({
      id,
      from: `${meta.width}x${meta.height}`,
      to: `${width}x${height}`,
      ar: (width / height).toFixed(2),
      trim,
      detected,
    })
  }

  console.log('\nid        source       cropped      AR    trimmed T/B/L/R')
  console.log('─'.repeat(70))
  for (const r of report) {
    console.log(
      `${r.id}  ${r.from.padEnd(11)}  ${r.to.padEnd(11)}  ${r.ar}  ` +
        `${r.trim.top}/${r.trim.bottom}/${r.trim.left}/${r.trim.right}`
    )
  }
  console.log(`\n${report.length} files cropped to ${path.relative(ROOT, OUT)}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
