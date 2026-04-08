import { AuditAction } from '@prisma/client'
import { prisma } from '../client'
import { createAuditEvent } from './auditService'
import { idSchema, programmeCreateSchema, programmeUpdateSchema } from './schemas'

export async function getDashboardSummary(tenantId: string) {
  const [programmeCount, cohortCount, participantCount] = await prisma.$transaction([
    prisma.programme.count({ where: { tenantId } }),
    prisma.cohort.count({ where: { programme: { tenantId } } }),
    prisma.participant.count({ where: { cohort: { programme: { tenantId } } } })
  ])

  return { programmeCount, cohortCount, participantCount }
}

export async function getProgrammeList(tenantId: string) {
  return prisma.programme.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          cohorts: true,
          milestoneTemplates: true
        }
      }
    }
  })
}

export async function getProgrammeById(programmeId: string, tenantId: string) {
  const id = idSchema.parse(programmeId)

  return prisma.programme.findFirst({
    where: {
      id,
      tenantId
    },
    include: {
      cohorts: {
        orderBy: { createdAt: 'desc' }
      },
      milestoneTemplates: {
        orderBy: { order: 'asc' }
      }
    }
  })
}

export async function createProgramme(
  input: unknown,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const valid = programmeCreateSchema.parse(input)
  const programme = await prisma.programme.create({
    data: {
      ...valid,
      tenantId: context.tenantId
    }
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.CREATE,
    entityType: 'Programme',
    entityId: programme.id,
    details: valid,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return programme
}

export async function updateProgramme(
  programmeId: string,
  input: unknown,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(programmeId)
  const valid = programmeUpdateSchema.parse(input)

  if (Object.keys(valid).length === 0) {
    throw new Error('No update payload provided.')
  }

  const existing = await prisma.programme.findFirst({ where: { id, tenantId: context.tenantId } })
  if (!existing) {
    throw new Error('Programme not found.')
  }

  const programme = await prisma.programme.update({
    where: { id },
    data: {
      ...valid
    }
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.UPDATE,
    entityType: 'Programme',
    entityId: programme.id,
    details: valid,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return programme
}

export async function deleteProgramme(
  programmeId: string,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(programmeId)
  const existing = await prisma.programme.findFirst({ where: { id, tenantId: context.tenantId } })
  if (!existing) {
    throw new Error('Programme not found.')
  }

  const programme = await prisma.programme.delete({ where: { id } })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.DELETE,
    entityType: 'Programme',
    entityId: programme.id,
    details: existing,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return programme
}
