import 'server-only'

import sharp from 'sharp'
import { uploadPublic } from './storage'
import type { ProductImage, Variant } from './content'

/**
 * Turn an uploaded photograph into the derivative set the site serves.
 *
 * Same shape as scripts/build-images.mjs, which produced the original 21: four
 * widths, `withoutEnlargement` so nothing is ever upscaled, metadata stripped,
 * and a 20px blurred placeholder so no image ever pops in against a blank box.
 *
 * The difference is where the output goes. The originals were written to
 * public/img at build time; these go to Firebase Storage, because a serverless
 * function has no writable public directory.
 */

const WIDTHS = [480, 768, 1200, 1600]

/**
 * AVIF is the slow step — a large one can take seconds, and this runs inside a
 * function with a time limit. Effort 2 gives up perhaps 5% of the file-size
 * benefit versus effort 6 and encodes several times faster, which is the right
 * trade when the alternative is a timeout.
 */
const AVIF = { quality: 55, effort: 2 } as const
const WEBP = { quality: 76, effort: 4 } as const
const JPEG = { quality: 82, mozjpeg: true, progressive: true } as const

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export type ProcessResult = {
  image: ProductImage
  bytes: number
}

/**
 * @param buffer the uploaded file
 * @param slug   used in the storage path, so files are identifiable later
 */
export async function processUpload(
  buffer: Buffer,
  slug: string
): Promise<ProcessResult> {
  // rotate() applies the EXIF orientation and then drops it. Without this a
  // photo taken in portrait on a phone renders on its side, because the pixels
  // are landscape and only the metadata says otherwise.
  const base = sharp(buffer, { failOn: 'error' }).rotate()

  const meta = await base.metadata()
  if (!meta.width || !meta.height) {
    throw new Error('That file does not look like an image.')
  }

  const prefix = `products/${slug}-${Date.now()}`
  const widths = WIDTHS.filter((w) => w <= meta.width!)
  if (widths.length === 0) widths.push(meta.width)

  let bytes = 0
  const variants: Variant[] = []

  for (const width of widths) {
    const resized = () =>
      sharp(buffer).rotate().resize({ width, withoutEnlargement: true })

    const [avifBuf, webpBuf, jpgBuf] = await Promise.all([
      resized().avif(AVIF).toBuffer(),
      resized().webp(WEBP).toBuffer(),
      resized().jpeg(JPEG).toBuffer(),
    ])

    const [avif, webp, jpg] = await Promise.all([
      uploadPublic(`${prefix}/${width}.avif`, avifBuf, 'image/avif'),
      uploadPublic(`${prefix}/${width}.webp`, webpBuf, 'image/webp'),
      uploadPublic(`${prefix}/${width}.jpg`, jpgBuf, 'image/jpeg'),
    ])

    bytes += avifBuf.length + webpBuf.length + jpgBuf.length
    variants.push({ width, avif, webp, jpg })
  }

  const lqipBuf = await sharp(buffer)
    .rotate()
    .resize(20, null, { fit: 'inside' })
    .blur(1.2)
    .webp({ quality: 40 })
    .toBuffer()

  // Dimensions come from the rotated image, not the raw file, or the aspect
  // ratio would be inverted for portrait phone photos.
  const rotated = await sharp(buffer).rotate().metadata()
  const width = rotated.width ?? meta.width
  const height = rotated.height ?? meta.height

  return {
    bytes,
    image: {
      variants,
      width,
      height,
      aspectRatio: Number((width / height).toFixed(4)),
      lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
      storagePrefix: prefix,
    },
  }
}

/** A filesystem- and URL-safe slug, used for storage paths and product ids. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'product'
  )
}
