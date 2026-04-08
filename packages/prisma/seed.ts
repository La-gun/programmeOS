import { MessagingChannel, PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ensureParticipantMilestones } from './lib/services/participantMilestoneService'

const prisma = new PrismaClient()

async function main() {
  const demoPassword = process.env.DEMO_SEED_PASSWORD ?? 'password'
  const passwordHash = await bcrypt.hash(demoPassword, 12)

  const tenant = await prisma.tenant.upsert({
    where: { domain: 'demo.programmeos.com' },
    update: { name: 'Demo Organization' },
    create: {
      name: 'Demo Organization',
      domain: 'demo.programmeos.com'
    }
  })

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
      update: {
        name: userData.name,
        passwordHash,
        tenantId: tenant.id
      },
      create: {
        email: userData.email,
        name: userData.name,
        passwordHash,
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
      update: { role: userData.role },
      create: {
        userId: user.id,
        tenantId: tenant.id,
        role: userData.role
      }
    })
  }

  const participantUser = await prisma.user.findUnique({
    where: { email: 'participant@example.com' }
  })

  if (participantUser) {
    let programme = await prisma.programme.findFirst({
      where: { tenantId: tenant.id, name: 'Demo Programme' }
    })
    if (!programme) {
      programme = await prisma.programme.create({
        data: {
          name: 'Demo Programme',
          description: 'Sample programme for participants and cohorts.',
          tenantId: tenant.id
        }
      })
    }

    let cohort = await prisma.cohort.findFirst({
      where: { programmeId: programme.id, name: 'Spring Cohort' }
    })
    if (!cohort) {
      cohort = await prisma.cohort.create({
        data: {
          name: 'Spring Cohort',
          programmeId: programme.id
        }
      })
    }

    const seedParticipant = await prisma.participant.upsert({
      where: {
        userId_cohortId: {
          userId: participantUser.id,
          cohortId: cohort.id
        }
      },
      update: {},
      create: {
        userId: participantUser.id,
        cohortId: cohort.id,
        status: 'active',
        statusEvents: {
          create: {
            fromStatus: null,
            toStatus: 'active',
            note: 'Seed enrolment'
          }
        }
      }
    })

    await prisma.participantChannelAddress.upsert({
      where: {
        participantId_channel: {
          participantId: seedParticipant.id,
          channel: MessagingChannel.WHATSAPP
        }
      },
      update: { address: '+15555550123' },
      create: {
        tenantId: tenant.id,
        participantId: seedParticipant.id,
        channel: MessagingChannel.WHATSAPP,
        address: '+15555550123'
      }
    })

    const templates = [
      { name: 'Orientation', order: 1, dueDays: 7 },
      { name: 'Mid-point reflection', order: 2, dueDays: 45 },
      { name: 'Capstone evidence', order: 3, dueDays: 90 }
    ]
    for (const t of templates) {
      const existing = await prisma.milestoneTemplate.findFirst({
        where: { programmeId: programme.id, name: t.name }
      })
      if (!existing) {
        await prisma.milestoneTemplate.create({
          data: {
            programmeId: programme.id,
            name: t.name,
            description: `Seed milestone: ${t.name}`,
            order: t.order,
            dueDays: t.dueDays
          }
        })
      }
    }

    await ensureParticipantMilestones(seedParticipant.id, tenant.id)
  }

  console.log('Seed completed: Demo Organization + demo users (credentials use DEMO_SEED_PASSWORD or default "password").')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
