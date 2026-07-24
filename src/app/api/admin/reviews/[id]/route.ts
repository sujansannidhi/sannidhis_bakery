import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteReview, updateReview } from '@/lib/admin-content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  quote: z.string().trim().min(1).max(1000).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  occasion: z.string().trim().max(120).optional().or(z.literal('')),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const parsed = schema.parse(await request.json())
    if (Object.keys(parsed).length === 0) {
      return NextResponse.json({ ok: false, message: 'Nothing to change.' }, { status: 400 })
    }
    await updateReview(id, parsed)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown error.' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await deleteReview(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown error.' },
      { status: 500 }
    )
  }
}
