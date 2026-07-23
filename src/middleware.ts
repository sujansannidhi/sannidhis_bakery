import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'

/**
 * The gate.
 *
 * This runs on Vercel's edge before any matched route is rendered, which is what
 * makes the admin area genuinely private rather than merely hidden. An
 * unauthenticated request never reaches the page component, so no admin markup
 * and no enquiry data is ever generated, let alone sent.
 *
 * Contrast with a password checked in the browser: the page would already have
 * been built and delivered, with everything it was "protecting" sitting in the
 * response for anyone who opened dev tools.
 */

const LOGIN_PATH = '/admin/login'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // The login page and its endpoint must stay reachable, or there is no way in.
  const isLoginRoute =
    pathname === LOGIN_PATH || pathname === '/api/admin/login'

  const authenticated = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value
  )

  if (isLoginRoute) {
    // Already signed in? Skip the login form.
    if (authenticated && pathname === LOGIN_PATH) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return applySecurityHeaders(NextResponse.next())
  }

  if (!authenticated) {
    // API routes get a status code; a redirect to an HTML page would be a
    // confusing response to a fetch.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { ok: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const url = new URL(LOGIN_PATH, request.url)
    // Send them where they were headed once they are in, but only ever to a
    // path on this site — an open redirect here would be a phishing gift.
    if (pathname.startsWith('/admin')) url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return applySecurityHeaders(NextResponse.next())
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  // Belt and braces alongside robots.txt: this one travels with the response,
  // so it holds even if something links straight to an admin URL.
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
