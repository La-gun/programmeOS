import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@programmeos/prisma'
import type { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.trim().toLowerCase()

        const user = await prisma.user.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' }
          },
          include: { tenant: true }
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isValid) {
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
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          tenant: user.tenant,
          role
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId
        token.tenant = user.tenant
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.tenantId = token.tenantId as string
        session.user.tenant = token.tenant as {
          id: string
          name: string
          domain?: string | null
        }
        session.user.role = token.role as Role
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}