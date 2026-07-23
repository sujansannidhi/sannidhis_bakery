/**
 * Shrink an image in the browser before uploading it.
 *
 * Not cosmetic: Vercel caps a request body at 4.5MB and a modern phone photo is
 * comfortably past that, so a straight upload would fail for exactly the
 * pictures worth using. Resizing to 2000px makes a 5MB photo roughly 700KB, and
 * 2000px is wider than the largest size the site ever displays, so nothing
 * visible is lost.
 *
 * Anything the canvas cannot decode (HEIC, say) falls through to the original
 * file; the server rejects it with a clear message if it truly cannot be read,
 * which beats failing silently here.
 */

const MAX_EDGE = 2000
const QUALITY = 0.9

export async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 2 * 1024 * 1024) {
    bitmap.close()
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY)
  )
  return blob ?? file
}
