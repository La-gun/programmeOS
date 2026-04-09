import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import type { Role } from '@prisma/client'
import { prisma } from '@programmeos/prisma'
import { isAuthDisabled } from '@/lib/auth-disabled'
import { authOptions } from '@/lib/auth'

async function getDevBypassSession(): Promise<Session | null> {
  try {
    const email = process.env.DEV_IMPERSONATE_EMAIL?.trim()
    const user = email
      ? await prisma.user.findUnique({
          where: { email },
          include: { tenant: true }
        })
      : await prisma.user.findFirst({
          orderBy: { createdAt: 'asc' },
          include: { tenant: true }
        })

    if (!user?.tenant) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '[getAppSession] DISABLE_AUTH is on but no user was found. Run `pnpm db:seed` (from repo root) or set DEV_IMPERSONATE_EMAIL to an existing user.'
        )
      }
      return null
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: user.tenantId
        }
      }
    })
    const role = (membership?.role ?? 'PARTICIPANT') as Role

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          domain: user.tenant.domain
        },
        role
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[getAppSession] Dev auth bypass failed (database unreachable or misconfigured?). Fix DATABASE_URL / start Postgres, or set DISABLE_AUTH=false. Error:',
        e instanceof Error ? e.message : e
      )
    }
    return null
  }
}

/** Use instead of getServerSession(authOptions) so dev bypass applies consistently. */
export async function getAppSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions)
  if (session) {
    return session
  }
  if (isAuthDisabled()) {
    return getDevBypassSession()
  }
  return null
}
