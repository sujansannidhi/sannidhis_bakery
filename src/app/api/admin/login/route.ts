import { NextResponse } from 'next/server'
import {
  checkPassword,
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth'
import { checkRateLimit, clientIp, rateLimit } from '@/lib/enquiries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The only unauthenticated admin endpoint.
 *
 * Two things matter here. The password comparison is timing-safe, so the time a
 * wrong guess takes reveals nothing about how much of it was right. And failures
 * are rate limited per IP, so the single-password design cannot simply be
 * guessed at machine speed.
 */
export async function POST(request: Request) {
  const ip = clientIp(request)

  // Read-only: getting the password right must never count against you.
  const limit = await checkRateLimit(`login:${ip}`, { max: 8, windowSeconds: 900 })
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many attempts. Try again in a few minutes.' },
      { status: 429 }
    )
  }

  let password = ''
  try {
    const body = await request.json()
    password = typeof body?.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json(
      { ok: false, message: 'That request could not be read.' },
      { status: 400 }
    )
  }

  let valid = false
  try {
    valid = checkPassword(password)
  } catch (error) {
    // ADMIN_PASSWORD is unset. Refuse rather than fall open.
    console.error('[admin] ', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { ok: false, message: 'The admin area is not configured yet.' },
      { status: 503 }
    )
  }

  if (!valid) {
    // Only a wrong password counts towards the limit.
    await rateLimit(`login:${ip}`, { max: 8, windowSeconds: 900 })
    // Deliberately vague, and identical for every failure mode.
    return NextResponse.json(
      { ok: false, message: 'That password is not right.' },
      { status: 401 }
    )
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions)
  return response
}
