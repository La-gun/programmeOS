import { AuditAction } from '@prisma/client'
import { prisma } from '../client'
import { createAuditEvent } from './auditService'
import { cohortCreateSchema, cohortUpdateSchema, idSchema } from './schemas'

export async function getCohortList(tenantId: string) {
  return prisma.cohort.findMany({
    where: { programme: { tenantId } },
    orderBy: { createdAt: 'desc' },
    include: {
      programme: true
    }
  })
}

export async function getCohortById(cohortId: string, tenantId: string) {
  const id = idSchema.parse(cohortId)
  return prisma.cohort.findFirst({
    where: { id, programme: { tenantId } },
    include: {
      programme: true,
      participants: {
        orderBy: { enrolledAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
      _count: { select: { participants: true } }
    }
  })
}

export async function createCohort(
  input: unknown,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const valid = cohortCreateSchema.parse(input)

  const programme = await prisma.programme.findFirst({
    where: { id: valid.programmeId, tenantId: context.tenantId }
  })

  if (!programme) {
    throw new Error('Programme not found.')
  }

  const cohort = await prisma.cohort.create({
    data: {
      ...valid
    }
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.CREATE,
    entityType: 'Cohort',
    entityId: cohort.id,
    details: valid,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return cohort
}

export async function updateCohort(
  cohortId: string,
  input: unknown,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(cohortId)
  const valid = cohortUpdateSchema.parse(input)

  if (Object.keys(valid).length === 0) {
    throw new Error('No update payload provided.')
  }

  if (valid.programmeId !== undefined) {
    const programme = await prisma.programme.findFirst({
      where: { id: valid.programmeId, tenantId: context.tenantId }
    })
    if (!programme) {
      throw new Error('Programme not found.')
    }
  }

  const existing = await prisma.cohort.findFirst({ where: { id, programme: { tenantId: context.tenantId } } })
  if (!existing) {
    throw new Error('Cohort not found.')
  }

  const cohort = await prisma.cohort.update({
    where: { id },
    data: {
      ...valid
    }
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.UPDATE,
    entityType: 'Cohort',
    entityId: cohort.id,
    details: valid,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return cohort
}

export async function deleteCohort(
  cohortId: string,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(cohortId)
  const existing = await prisma.cohort.findFirst({ where: { id, programme: { tenantId: context.tenantId } } })
  if (!existing) {
    throw new Error('Cohort not found.')
  }

  const cohort = await prisma.cohort.delete({ where: { id } })
  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.DELETE,
    entityType: 'Cohort',
    entityId: cohort.id,
    details: existing,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return cohort
}
