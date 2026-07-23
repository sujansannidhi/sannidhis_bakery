import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createProduct, listProducts, reorderProducts } from '@/lib/admin-content'
import { slugify } from '@/lib/images'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const imageSchema = z.object({
  variants: z
    .array(
      z.object({
        width: z.number(),
        avif: z.string().optional(),
        webp: z.string().optional(),
        jpg: z.string(),
      })
    )
    .min(1),
  width: z.number(),
  height: z.number(),
  aspectRatio: z.number(),
  lqip: z.string(),
  legacyStem: z.string().optional(),
  storagePrefix: z.string().optional(),
})

const createSchema = z.object({
  name: z.string().trim().min(1, 'A name is needed.').max(120),
  category: z.string().trim().min(1, 'Choose a section.'),
  blurb: z.string().trim().max(300).default(''),
  alt: z.string().trim().max(600).default(''),
  featured: z.boolean().default(false),
  image: imageSchema,
})

export async function GET() {
  try {
    return NextResponse.json({ ok: true, products: await listProducts() })
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: message(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  let parsed
  try {
    parsed = createSchema.safeParse(await request.json())
  } catch {
    return NextResponse.json(
      { ok: false, message: 'That request could not be read.' },
      { status: 400 }
    )
  }

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid product.' },
      { status: 422 }
    )
  }

  try {
    // Ids come from the name, with a numeric suffix if that is taken — the
    // owner should never have to think about a unique identifier.
    const base = slugify(parsed.data.name)
    const existing = new Set((await listProducts()).map((p) => p.id))
    let id = base
    let n = 2
    while (existing.has(id)) id = `${base}-${n++}`

    await createProduct(id, parsed.data)
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    return NextResponse.json({ ok: false, message: message(error) }, { status: 500 })
  }
}

/** Reorder within the menu. Body: { ids: [...] } in the new order. */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const ids = z.array(z.string()).parse(body?.ids)
    await reorderProducts(ids)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: false, message: message(error) }, { status: 400 })
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error.'
}
