import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getEnquiry, updateEnquiry } from '@/lib/enquiries'
import { isMailConfigured, sendMail } from '@/lib/mail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  subject: z.string().trim().min(1, 'A subject is needed.').max(200),
  body: z.string().trim().min(1, 'The message is empty.').max(20000),
  /** Set when this is a quote, so the status and timestamp follow along. */
  markQuoted: z.boolean().default(false),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isMailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'Email is not connected. Add GMAIL_USER and GMAIL_APP_PASSWORD, then redeploy.',
      },
      { status: 503 }
    )
  }

  let parsed
  try {
    parsed = schema.safeParse(await request.json())
  } catch {
    return NextResponse.json(
      { ok: false, message: 'That request could not be read.' },
      { status: 400 }
    )
  }
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid message.' },
      { status: 422 }
    )
  }

  const enquiry = await getEnquiry(id)
  if (!enquiry) {
    return NextResponse.json(
      { ok: false, message: 'That enquiry no longer exists.' },
      { status: 404 }
    )
  }

  const result = await sendMail({
    to: enquiry.Email,
    subject: parsed.data.subject,
    text: parsed.data.body,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: `Could not send: ${result.message}` },
      { status: 502 }
    )
  }

  // Only record the send after it succeeded — a timestamp for an email that
  // never left would be worse than no timestamp.
  const now = new Date().toISOString()
  await updateEnquiry(id, {
    lastEmailedAt: now,
    ...(parsed.data.markQuoted && enquiry.status === 'new'
      ? { status: 'quoted' as const, quotedAt: now }
      : {}),
  })

  return NextResponse.json({ ok: true })
}
