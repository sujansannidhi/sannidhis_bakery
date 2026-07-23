import { NextResponse } from 'next/server'
import { MAX_UPLOAD_BYTES, processUpload, slugify } from '@/lib/images'
import { isStorageConfigured } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Encoding four widths in three formats takes real time. The default limit
// would cut a large photograph off part-way through.
export const maxDuration = 60

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/**
 * Accept a photograph, produce the derivative set, return the image record.
 *
 * Authentication is handled by middleware, which matches /api/admin/:path* and
 * returns 401 before this runs.
 *
 * The browser downscales to 2000px before uploading, so what arrives here is
 * typically well under a megabyte even from a modern phone. The limit below is
 * a backstop against a deliberately large file, not the normal path.
 */
export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Photo storage is not configured yet.' },
      { status: 503 }
    )
  }

  let file: File | null = null
  let name = ''

  try {
    const form = await request.formData()
    const candidate = form.get('file')
    file = candidate instanceof File ? candidate : null
    name = String(form.get('name') ?? '')
  } catch {
    return NextResponse.json(
      { ok: false, message: 'That upload could not be read.' },
      { status: 400 }
    )
  }

  if (!file) {
    return NextResponse.json(
      { ok: false, message: 'No file was attached.' },
      { status: 400 }
    )
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      {
        ok: false,
        message: `That is a ${file.type || 'unknown'} file. Use a JPEG, PNG or WebP photograph.`,
      },
      { status: 415 }
    )
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        message: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB, which is larger than the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB limit.`,
      },
      { status: 413 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { image, bytes } = await processUpload(buffer, slugify(name || 'photo'))
    return NextResponse.json({ ok: true, image, bytes })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown error.'
    console.error('[photos] processing failed:', detail)
    return NextResponse.json(
      { ok: false, message: `That photograph could not be processed. ${detail}` },
      { status: 500 }
    )
  }
}
