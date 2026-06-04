import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth.edge'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value

  if (request.nextUrl.pathname === '/login') {
    if (token) {
      const userId = await verifyToken(token)
      if (userId) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
    return NextResponse.next()
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const userId = await verifyToken(token)
  if (!userId) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('token')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
