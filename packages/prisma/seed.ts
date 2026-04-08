import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { name: 'Demo Organization' },
    update: {},
    create: {
      name: 'Demo Organization',
      domain: 'demo.programmeos.com'
    }
  })

  // Create demo users
  const users = [
    {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN' as const
    },
    {
      email: 'manager@example.com',
      name: 'Manager User',
      role: 'MANAGER' as const
    },
    {
      email: 'facilitator@example.com',
      name: 'Facilitator User',
      role: 'FACILITATOR' as const
    },
    {
      email: 'participant@example.com',
      name: 'Participant User',
      role: 'PARTICIPANT' as const
    }
  ]

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        tenantId: tenant.id
      }
    })

    await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenant.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        tenantId: tenant.id,
        role: userData.role
      }
    })
  }

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })