import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const path = request.nextUrl.pathname

  console.log('HOST:', host)

  if (host === 'www.klarum.ca' && (path.startsWith('/login') || path.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/login', '/login/:path*', '/register', '/register/:path*'],
}