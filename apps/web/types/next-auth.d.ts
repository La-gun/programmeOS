import { DefaultSession } from 'next-auth'
import type { Role } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      tenantId: string
      tenant: {
        id: string
        name: string
        domain?: string | null
      }
      role: Role
    } & DefaultSession['user']
  }

  interface User {
    tenantId: string
    tenant: {
      id: string
      name: string
      domain?: string | null
    }
    role: Role
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    tenantId: string
    tenant: {
      id: string
      name: string
      domain?: string | null
    }
    role: Role
  }
}