import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createReview, listReviews } from '@/lib/admin-content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  quote: z.string().trim().min(1, 'The review text is needed.').max(1000),
  name: z.string().trim().min(1, 'A name is needed for attribution.').max(120),
  occasion: z.string().trim().max(120).optional().or(z.literal('')),
})

export async function GET() {
  try {
    return NextResponse.json({ ok: true, reviews: await listReviews() })
  } catch (error) {
    return NextResponse.json({ ok: false, message: msg(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json())
    const id = await createReview(parsed)
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    const m = error instanceof z.ZodError ? error.issues[0]?.message : msg(error)
    return NextResponse.json({ ok: false, message: m }, { status: 422 })
  }
}

function msg(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error.'
}
