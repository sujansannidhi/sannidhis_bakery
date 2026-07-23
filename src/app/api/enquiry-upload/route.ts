import { NextResponse } from 'next/server'
import { isStorageConfigured, uploadPublic } from '@/lib/storage'
import { clientIp, rateLimit } from '@/lib/enquiries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const MAX = 6 * 1024 * 1024

/**
 * A public upload endpoint for things attached to an order enquiry — the
 * customer's inspiration photo, and the rasterised cake design.
 *
 * This is deliberately separate from /api/admin/photos, which is behind auth and
 * runs the full sharp derivative pipeline. Here the file just needs to be stored
 * and linked, so it goes straight to Blob without processing. It IS rate limited
 * and type/size checked, because it is open to the world.
 */
export async function POST(request: Request) {
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Uploads are not available right now.' },
      { status: 503 }
    )
  }

  const limit = await rateLimit(`upload:${clientIp(request)}`, {
    max: 12,
    windowSeconds: 600,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many uploads. Please wait a moment.' },
      { status: 429 }
    )
  }

  let file: File | null = null
  let kind = 'photo'
  try {
    const form = await request.formData()
    const candidate = form.get('file')
    file = candidate instanceof File ? candidate : null
    kind = String(form.get('kind') ?? 'photo') === 'design' ? 'design' : 'photo'
  } catch {
    return NextResponse.json(
      { ok: false, message: 'That upload could not be read.' },
      { status: 400 }
    )
  }

  if (!file) {
    return NextResponse.json({ ok: false, message: 'No file was attached.' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { ok: false, message: 'Please use a JPEG, PNG or WebP image.' },
      { status: 415 }
    )
  }
  if (file.size > MAX) {
    return NextResponse.json(
      { ok: false, message: 'That image is too large.' },
      { status: 413 }
    )
  }

  try {
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    // A time-based path; these are one-shot attachments, not a managed library.
    const stamp = Date.now().toString(36) + Math.round(performance.now()).toString(36)
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadPublic(`enquiries/${kind}-${stamp}.${ext}`, buffer, file.type)
    return NextResponse.json({ ok: true, url })
  } catch (error) {
    console.error('[enquiry-upload] failed:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { ok: false, message: 'That upload did not work. Please try again.' },
      { status: 500 }
    )
  }
}
