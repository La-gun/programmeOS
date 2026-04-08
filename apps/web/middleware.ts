import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    if (req.nextUrl.pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        if (req.nextUrl.pathname === '/login') {
          return true
        }
        return !!token
      }
    },
    pages: {
      signIn: '/login'
    }
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/login']
}
