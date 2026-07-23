import { NextResponse } from 'next/server'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  // Same attributes as when it was set, or the browser keeps the original.
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
  return response
}
