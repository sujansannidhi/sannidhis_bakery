/**
 * The single place the order form talks to the outside world.
 *
 * This now posts to our own route handler at /api/orders rather than straight to
 * Formspree. That handler validates the enquiry server-side where it cannot be
 * bypassed, stores it so it appears in the admin area, and then forwards it to
 * Formspree so the owner's phone notification still arrives.
 *
 * The form component above this knows none of that — it was built with this file
 * as the only thing aware of where enquiries go, and this is the change it was
 * designed for.
 */

const ENDPOINT = '/api/orders'

export type OrderPayload = Record<string, string>

export type SubmitResult =
  | { ok: true }
  | { ok: false; message: string; errors?: Record<string, string> }

export async function submitOrder(payload: OrderPayload): Promise<SubmitResult> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const body = await response.json().catch(() => null)

    if (response.ok && body?.ok) return { ok: true }

    return {
      ok: false,
      message:
        body?.message ??
        "We couldn't send that just now. Please try again, or message us on Instagram.",
      // Field-level messages from server-side validation, keyed the same way the
      // form's own client-side errors are.
      errors: body?.errors,
    }
  } catch {
    return {
      ok: false,
      message:
        'That did not send — please check your connection and try again, or message us on Instagram.',
    }
  }
}
