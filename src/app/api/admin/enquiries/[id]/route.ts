import { NextResponse } from 'next/server'
import { updateEnquiry } from '@/lib/enquiries'
import { enquiryUpdateSchema } from '@/lib/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Update an enquiry's status or private notes.
 *
 * Authentication is handled by middleware, which matches /api/admin/:path* and
 * returns 401 before this ever runs.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, message: 'That request could not be read.' },
      { status: 400 }
    )
  }

  const parsed = enquiryUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'That is not a valid change.' },
      { status: 422 }
    )
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { ok: false, message: 'Nothing to change.' },
      { status: 400 }
    )
  }

  try {
    await updateEnquiry(id, parsed.data)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(
      '[admin] failed to update enquiry:',
      error instanceof Error ? error.message : error
    )
    return NextResponse.json(
      { ok: false, message: 'Could not save that. Please try again.' },
      { status: 500 }
    )
  }
}
