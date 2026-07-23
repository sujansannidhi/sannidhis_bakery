import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteProduct, updateProduct } from '@/lib/admin-content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).optional(),
  blurb: z.string().trim().max(300).optional(),
  alt: z.string().trim().max(600).optional(),
  featured: z.boolean().optional(),
  order: z.number().optional(),
  image: z.record(z.string(), z.unknown()).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const parsed = patchSchema.parse(await request.json())
    if (Object.keys(parsed).length === 0) {
      return NextResponse.json(
        { ok: false, message: 'Nothing to change.' },
        { status: 400 }
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateProduct(id, parsed as any)
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
    await deleteProduct(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown error.' },
      { status: 500 }
    )
  }
}
