import { NextResponse } from 'next/server'
import { enquirySchema, fieldErrors } from '@/lib/validation'
import { clientIp, createEnquiry, rateLimit } from '@/lib/enquiries'
import { isFirebaseConfigured } from '@/lib/firebase'
import { confirmationEmail, isMailConfigured, sendMail } from '@/lib/mail'

/**
 * Order intake.
 *
 * The form used to POST straight to Formspree from the browser. Everything now
 * goes through here first, which buys three things that were impossible before:
 * validation that cannot be bypassed, a stored record of every enquiry, and rate
 * limiting.
 *
 * Formspree is still called at the end, so the owner's phone notification keeps
 * working exactly as it did. That is deliberate: this change should be invisible
 * to them until they open the admin area.
 */

// Firebase Admin needs Node, not Edge.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FORMSPREE = 'https://formspree.io/f/xnjebdqe'

export async function POST(request: Request) {
  let payload: Record<string, unknown>

  try {
    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      payload = await request.json()
    } else {
      payload = Object.fromEntries(await request.formData())
    }
  } catch {
    return NextResponse.json(
      { ok: false, message: 'That request could not be read.' },
      { status: 400 }
    )
  }

  // Honeypot. Answer 200 rather than an error: a bot that knows it was caught
  // learns to try again differently, and a false positive on a real person
  // should not look like a failure.
  if (typeof payload._gotcha === 'string' && payload._gotcha.trim() !== '') {
    return NextResponse.json({ ok: true })
  }
  delete payload._gotcha

  const ip = clientIp(request)
  const limit = await rateLimit(`orders:${ip}`, { max: 5, windowSeconds: 600 })
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message:
          'That is a few enquiries in a short time. Please wait a little while, or message us on Instagram.',
      },
      { status: 429 }
    )
  }

  const parsed = enquirySchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Some of those details need another look.',
        errors: fieldErrors(parsed.error),
      },
      { status: 422 }
    )
  }

  const enquiry = parsed.data

  // Store first, notify second. If Formspree is down we still have the enquiry;
  // if the store fails we would rather the customer knew than lose it silently.
  let stored = false
  if (isFirebaseConfigured()) {
    try {
      await createEnquiry(enquiry)
      stored = true
    } catch (error) {
      console.error(
        '[orders] failed to store enquiry:',
        error instanceof Error ? error.message : error
      )
    }
  }

  const notified = await forwardToFormspree(enquiry)

  /*
    Confirmation to the customer, best effort.

    Deliberately after the store and the owner's notification, and deliberately
    not able to fail the request: someone who has just filled in a form should
    never see an error because our mail server had a bad moment. The enquiry is
    already safe by this point.
  */
  if (isMailConfigured()) {
    const { subject, text } = confirmationEmail(enquiry)
    void sendMail({ to: enquiry.Email, subject, text }).then((result) => {
      if (!result.ok) {
        console.error('[orders] confirmation email failed:', result.message)
      }
    })
  }

  if (!stored && !notified) {
    // Both paths failed — the enquiry is genuinely lost, so say so rather than
    // showing a success screen to someone whose birthday cake depends on it.
    return NextResponse.json(
      {
        ok: false,
        message:
          "We couldn't send that just now. Please try again, or message us on Instagram.",
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}

/** Keeps the owner's existing phone notification working, now server-side. */
async function forwardToFormspree(
  enquiry: Record<string, string | undefined>
): Promise<boolean> {
  try {
    const body = new FormData()
    for (const [key, value] of Object.entries(enquiry)) {
      if (value) body.append(key, value)
    }
    const response = await fetch(FORMSPREE, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
    })
    return response.ok
  } catch (error) {
    console.error(
      '[orders] failed to notify:',
      error instanceof Error ? error.message : error
    )
    return false
  }
}
