import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteCategory, listCategories, upsertCategory } from '@/lib/admin-content'
import { slugify } from '@/lib/images'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1, 'A section needs a name.').max(80),
  line: z.string().trim().max(200).default(''),
  cover: z.string().nullable().optional(),
})

export async function GET() {
  try {
    return NextResponse.json({ ok: true, categories: await listCategories() })
  } catch (error) {
    return NextResponse.json({ ok: false, message: msg(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json())
    const id = parsed.id?.trim() || slugify(parsed.name)
    await upsertCategory(id, parsed)
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    return NextResponse.json({ ok: false, message: msg(error) }, { status: 422 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    await deleteCategory(String(id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, message: msg(error) }, { status: 409 })
  }
}

function msg(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error.'
}
