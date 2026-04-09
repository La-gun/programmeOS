import { isAuthDisabled } from '@/lib/auth-disabled'
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    // Only skip the login page when we have a real JWT. If DISABLE_AUTH is on but the DB
    // bypass failed, redirecting /login → /dashboard would loop with dashboard layout.
    if (req.nextUrl.pathname === '/login' && token) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        if (isAuthDisabled()) {
          return true
        }
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
