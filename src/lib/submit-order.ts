/**
 * The single place the order form talks to the outside world.
 *
 * Currently Formspree, which is a client-side POST. That has one consequence
 * worth being honest about: there is no server-side validation. Everything below
 * runs in the browser and a determined person can bypass it. The honeypot and
 * the client checks stop ordinary spam and ordinary mistakes, which is what this
 * form actually faces.
 *
 * To move to a real server surface later, replace ENDPOINT with a Next.js route
 * handler and validate the same shape there. Nothing outside this file needs to
 * change.
 */

// TODO(owner): this is the Formspree form from the previous site. Replace it if
// you create a new one — Formspree → your form → integration → endpoint.
const ENDPOINT = 'https://formspree.io/f/mykbnddq'

export type OrderPayload = Record<string, string>

export type SubmitResult =
  | { ok: true }
  | { ok: false; message: string }

export async function submitOrder(payload: OrderPayload): Promise<SubmitResult> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: toFormData(payload),
    })

    if (response.ok) return { ok: true }

    // Formspree returns a JSON body describing what it rejected.
    const body = await response.json().catch(() => null)
    const detail = body?.errors?.[0]?.message
    return {
      ok: false,
      message: detail
        ? `We couldn't send that: ${detail}`
        : "We couldn't send that just now. Please try again, or message us on Instagram.",
    }
  } catch {
    return {
      ok: false,
      message:
        'That did not send — please check your connection and try again, or message us on Instagram.',
    }
  }
}

function toFormData(payload: OrderPayload): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    if (value) data.append(key, value)
  }
  return data
}
