/**
 * Session signing and password checking for the admin area.
 *
 * Everything here uses Web Crypto rather than node:crypto, because middleware.ts
 * imports it and middleware runs on the Edge runtime where node:crypto does not
 * exist.
 *
 * The session cookie is a signed statement of "this session is valid until X".
 * It carries no secret and no user data — it does not need to, because there is
 * only one account. Its only job is to be unforgeable, which the HMAC provides.
 */

const encoder = new TextEncoder()

export const SESSION_COOKIE = 'sb_admin'
/** Seven days. Long enough not to be annoying, short enough to expire. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7

type SessionPayload = {
  /** Expiry, seconds since epoch. */
  exp: number
}

function requireSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      'ADMIN_SESSION_SECRET is missing or too short. Generate one with ' +
        '`openssl rand -base64 32` and set it in your environment.'
    )
  }
  return secret
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

/** URL-safe base64 without padding, so the value is cookie-safe. */
function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/**
 * Compare two strings in time that does not depend on where they differ.
 *
 * A plain `===` returns as soon as it finds a mismatched character, so the time
 * it takes reveals how many leading characters were correct. That is enough to
 * recover a password one character at a time. This always compares every byte.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)
  // Compare lengths at the end rather than returning early, so a wrong-length
  // guess costs the same as a right-length one.
  let mismatch = aBytes.length === bBytes.length ? 0 : 1
  const length = Math.max(aBytes.length, bBytes.length)
  for (let i = 0; i < length; i++) {
    mismatch |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return mismatch === 0
}

export async function createSessionToken(
  maxAgeSeconds: number = SESSION_MAX_AGE
): Promise<string> {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  }
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)))
  const key = await hmacKey(requireSecret())
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return `${body}.${toBase64Url(new Uint8Array(signature))}`
}

/**
 * Verify a token's signature and expiry. Returns false for anything malformed —
 * a caller should never need to distinguish "tampered" from "expired".
 */
export async function verifySessionToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false

  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [body, signature] = parts

  try {
    const key = await hmacKey(requireSecret())
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      encoder.encode(body)
    )
    if (!valid) return false

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body))
    ) as SessionPayload

    return (
      typeof payload.exp === 'number' && payload.exp > Math.floor(Date.now() / 1000)
    )
  } catch {
    return false
  }
}

/** Check a submitted password against the configured one. */
export function checkPassword(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    throw new Error(
      'ADMIN_PASSWORD is not set. The admin area refuses to authenticate ' +
        'rather than let anyone in.'
    )
  }
  return timingSafeEqual(submitted, expected)
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  /*
    Strict rather than Lax. Lax already blocks cross-site POSTs, so CSRF was
    covered either way — but Lax still sends the session on a top-level
    navigation from another site, and there is no reason an admin session should
    travel on a link someone else wrote. The only cost is that following an
    /admin link from outside shows the sign-in screen once.
  */
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
}
