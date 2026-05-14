import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/community',
  '/tournaments',
  '/leaderboard',
  '/jobs',
  '/matches',
  '/rooms',
  '/profile',
  '/admin',
]

const AUTH_PAGES = ['/auth/login', '/auth/signup']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAuthCookie = request.cookies.get('khoj-auth')?.value === '1'

  if (pathname === '/tracks' || pathname.startsWith('/tracks/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname === '/studio/tracks' || pathname.startsWith('/studio/tracks/')) {
    return NextResponse.redirect(new URL('/studio', request.url))
  }

  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  const isAuthPage = AUTH_PAGES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isProtectedRoute && !hasAuthCookie) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthPage && hasAuthCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/community/:path*',
    '/tournaments/:path*',
    '/leaderboard/:path*',
    '/jobs/:path*',
    '/matches/:path*',
    '/rooms/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/tracks/:path*',
    '/studio/tracks/:path*',
    '/auth/login',
    '/auth/signup',
  ],
}
