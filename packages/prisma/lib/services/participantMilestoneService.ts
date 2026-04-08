import { AuditAction, MilestoneStatus, Role } from '@prisma/client'
import { prisma } from '../client'
import { createAuditEvent } from './auditService'
import { idSchema, participantMilestoneUpdateSchema } from './schemas'

const REVIEWER_ROLES: Role[] = ['ADMIN', 'MANAGER', 'FACILITATOR']

function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export async function getParticipantMilestoneForTenant(participantMilestoneId: string, tenantId: string) {
  const id = idSchema.parse(participantMilestoneId)
  return prisma.participantMilestone.findFirst({
    where: {
      id,
      participant: { cohort: { programme: { tenantId } } }
    },
    include: {
      participant: {
        select: {
          id: true,
          userId: true,
          cohort: {
            select: {
              id: true,
              name: true,
              startDate: true,
              programme: { select: { id: true, name: true, tenantId: true } }
            }
          }
        }
      },
      milestoneTemplate: true
    }
  })
}

export async function ensureParticipantMilestones(participantId: string, tenantId: string) {
  const pid = idSchema.parse(participantId)
  const participant = await prisma.participant.findFirst({
    where: { id: pid, cohort: { programme: { tenantId } } },
    include: {
      cohort: { select: { startDate: true, programmeId: true } }
    }
  })
  if (!participant) {
    throw new Error('Participant not found.')
  }

  const templates = await prisma.milestoneTemplate.findMany({
    where: { programmeId: participant.cohort.programmeId },
    orderBy: { order: 'asc' }
  })

  const start = participant.cohort.startDate

  for (const t of templates) {
    const dueDate =
      start && t.dueDays != null && t.dueDays >= 0 ? addDays(start, t.dueDays) : null

    await prisma.participantMilestone.upsert({
      where: {
        participantId_milestoneTemplateId: {
          participantId: pid,
          milestoneTemplateId: t.id
        }
      },
      create: {
        participantId: pid,
        milestoneTemplateId: t.id,
        dueDate
      },
      update: {}
    })
  }

  return listParticipantMilestones(pid, tenantId)
}

const milestoneListInclude = {
  milestoneTemplate: { select: { id: true, name: true, description: true, order: true, dueDays: true } },
  evidenceSubmissions: {
    orderBy: { submittedAt: 'desc' as const },
    take: 20,
    include: {
      reviews: {
        include: { reviewer: { select: { id: true, name: true, email: true } } }
      }
    }
  }
} as const

export async function listParticipantMilestones(participantId: string, tenantId: string) {
  const pid = idSchema.parse(participantId)
  const ok = await prisma.participant.findFirst({
    where: { id: pid, cohort: { programme: { tenantId } } },
    select: { id: true }
  })
  if (!ok) {
    throw new Error('Participant not found.')
  }

  return prisma.participantMilestone.findMany({
    where: { participantId: pid },
    orderBy: { milestoneTemplate: { order: 'asc' } },
    include: milestoneListInclude
  })
}

const MILESTONE_STATUS_EDGES: Record<MilestoneStatus, MilestoneStatus[]> = {
  [MilestoneStatus.NOT_STARTED]: [MilestoneStatus.IN_PROGRESS, MilestoneStatus.OVERDUE],
  [MilestoneStatus.IN_PROGRESS]: [
    MilestoneStatus.COMPLETED,
    MilestoneStatus.OVERDUE,
    MilestoneStatus.NOT_STARTED
  ],
  [MilestoneStatus.OVERDUE]: [MilestoneStatus.IN_PROGRESS, MilestoneStatus.COMPLETED, MilestoneStatus.NOT_STARTED],
  [MilestoneStatus.COMPLETED]: [MilestoneStatus.IN_PROGRESS]
}

export async function updateParticipantMilestone(
  participantMilestoneId: string,
  input: unknown,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(participantMilestoneId)
  const valid = participantMilestoneUpdateSchema.parse(input)
  if (Object.keys(valid).length === 0) {
    throw new Error('No update payload provided.')
  }

  const existing = await getParticipantMilestoneForTenant(id, context.tenantId)
  if (!existing) {
    throw new Error('Milestone not found.')
  }

  if (valid.status !== undefined && valid.status !== existing.status) {
    const allowed = MILESTONE_STATUS_EDGES[existing.status] ?? []
    if (!allowed.includes(valid.status)) {
      throw new Error(
        `Invalid milestone status transition: ${existing.status} → ${valid.status}. Allowed: ${allowed.join(', ')}`
      )
    }
  }

  const data: {
    status?: MilestoneStatus
    notes?: string | null
    dueDate?: Date | null
    startedAt?: Date | null
    completedAt?: Date | null
  } = {}

  if (valid.status !== undefined) {
    data.status = valid.status
    if (valid.status === MilestoneStatus.IN_PROGRESS && !existing.startedAt) {
      data.startedAt = new Date()
    }
    if (valid.status === MilestoneStatus.COMPLETED) {
      data.completedAt = new Date()
    }
    if (valid.status === MilestoneStatus.NOT_STARTED) {
      data.startedAt = null
      data.completedAt = null
    }
  }
  if (valid.notes !== undefined) {
    data.notes = valid.notes ?? null
  }
  if (valid.dueDate !== undefined) {
    data.dueDate = valid.dueDate ?? null
  }

  const updated = await prisma.participantMilestone.update({
    where: { id },
    data,
    include: milestoneListInclude
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.UPDATE,
    entityType: 'ParticipantMilestone',
    entityId: id,
    details: valid,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return updated
}

export async function assertUserCanReview(userId: string, tenantId: string) {
  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { role: true }
  })
  if (!membership || !REVIEWER_ROLES.includes(membership.role)) {
    throw new Error('User is not eligible to review evidence for this organization.')
  }
  return membership
}
