import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      tenantId: string
      tenant: {
        id: string
        name: string
        domain?: string
      }
      role: string
    } & DefaultSession['user']
  }

  interface User {
    tenantId: string
    tenant: {
      id: string
      name: string
      domain?: string
    }
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    tenantId: string
    tenant: {
      id: string
      name: string
      domain?: string
    }
    role: string
  }
}