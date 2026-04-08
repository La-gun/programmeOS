import { AuditAction } from '@prisma/client'
import { prisma } from '../client'
import { createAuditEvent } from './auditService'
import { ensureParticipantMilestones } from './participantMilestoneService'
import {
  consentBatchSchema,
  idSchema,
  participantCreateSchema,
  participantUpdateSchema
} from './schemas'

const participantInclude = {
  user: { select: { id: true, name: true, email: true } },
  cohort: {
    select: {
      id: true,
      name: true,
      programme: { select: { id: true, name: true, tenantId: true } }
    }
  },
  profile: true,
  consentRecords: { orderBy: { type: 'asc' as const } },
  statusEvents: {
    orderBy: { createdAt: 'desc' as const },
    take: 100,
    include: {
      changedBy: { select: { id: true, name: true, email: true } }
    }
  },
  documents: {
    orderBy: { createdAt: 'desc' as const },
    take: 50,
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } }
    }
  },
  _count: { select: { participantMilestones: true } }
} as const

export async function assertParticipantInTenant(participantId: string, tenantId: string) {
  const id = idSchema.parse(participantId)
  const row = await prisma.participant.findFirst({
    where: { id, cohort: { programme: { tenantId } } },
    select: { id: true, userId: true }
  })
  return row
}

export async function getParticipantList(
  tenantId: string,
  filters?: { cohortId?: string; search?: string }
) {
  const cohortId = filters?.cohortId ? idSchema.parse(filters.cohortId) : undefined
  const search = filters?.search?.trim()

  return prisma.participant.findMany({
    where: {
      cohort: { programme: { tenantId }, ...(cohortId ? { id: cohortId } : {}) },
      ...(search
        ? {
            user: {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        : {})
    },
    orderBy: { enrolledAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      cohort: {
        select: {
          id: true,
          name: true,
          programme: { select: { id: true, name: true } }
        }
      },
      profile: true,
      _count: { select: { consentRecords: true, statusEvents: true, documents: true } }
    }
  })
}

export async function getParticipantById(participantId: string, tenantId: string) {
  const id = idSchema.parse(participantId)
  return prisma.participant.findFirst({
    where: { id, cohort: { programme: { tenantId } } },
    include: participantInclude
  })
}

export async function listTenantUsersForEnrollment(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true },
    orderBy: { email: 'asc' }
  })
}

export async function listCohortsForEnrollment(tenantId: string) {
  return prisma.cohort.findMany({
    where: { programme: { tenantId } },
    select: {
      id: true,
      name: true,
      programme: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getParticipantsForUser(userId: string, tenantId: string) {
  return prisma.participant.findMany({
    where: { userId, cohort: { programme: { tenantId } } },
    select: {
      id: true,
      cohort: {
        select: {
          id: true,
          name: true,
          programme: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { enrolledAt: 'desc' }
  })
}

export async function createParticipant(
  input: unknown,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const valid = participantCreateSchema.parse(input)

  const [user, cohort] = await Promise.all([
    prisma.user.findFirst({ where: { id: valid.userId, tenantId: context.tenantId } }),
    prisma.cohort.findFirst({
      where: { id: valid.cohortId, programme: { tenantId: context.tenantId } },
      select: { id: true }
    })
  ])

  if (!user) {
    throw new Error('User not found in this organization.')
  }
  if (!cohort) {
    throw new Error('Cohort not found.')
  }

  const status = valid.status ?? 'active'

  const participant = await prisma.participant.create({
    data: {
      userId: valid.userId,
      cohortId: valid.cohortId,
      status,
      ...(valid.profile
        ? {
            profile: {
              create: {
                bio: valid.profile.bio ?? null,
                goals: valid.profile.goals ?? null,
                skills: valid.profile.skills ?? null,
                experience: valid.profile.experience ?? null
              }
            }
          }
        : {}),
      statusEvents: {
        create: {
          fromStatus: null,
          toStatus: status,
          note: 'Enrolled',
          changedById: context.userId ?? null
        }
      }
    },
    include: participantInclude
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.CREATE,
    entityType: 'Participant',
    entityId: participant.id,
    details: { userId: valid.userId, cohortId: valid.cohortId, status },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  await ensureParticipantMilestones(participant.id, context.tenantId)

  return participant
}

export async function updateParticipant(
  participantId: string,
  input: unknown,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(participantId)
  const valid = participantUpdateSchema.parse(input)

  if (Object.keys(valid).length === 0) {
    throw new Error('No update payload provided.')
  }

  const existing = await prisma.participant.findFirst({
    where: { id, cohort: { programme: { tenantId: context.tenantId } } },
    include: { profile: true }
  })

  if (!existing) {
    throw new Error('Participant not found.')
  }

  if (valid.cohortId !== undefined) {
    const cohort = await prisma.cohort.findFirst({
      where: { id: valid.cohortId, programme: { tenantId: context.tenantId } }
    })
    if (!cohort) {
      throw new Error('Cohort not found.')
    }
  }

  let statusEvent:
    | { fromStatus: string | null; toStatus: string; note: string | null; changedById: string | null }
    | undefined

  if (valid.status !== undefined && valid.status !== existing.status) {
    statusEvent = {
      fromStatus: existing.status,
      toStatus: valid.status,
      note: valid.statusNote ?? null,
      changedById: context.userId ?? null
    }
  }

  const participant = await prisma.$transaction(async (tx) => {
    if (statusEvent) {
      await tx.participantStatusEvent.create({
        data: {
          participantId: id,
          fromStatus: statusEvent.fromStatus,
          toStatus: statusEvent.toStatus,
          note: statusEvent.note,
          changedById: statusEvent.changedById
        }
      })
    }

    let profilePayload:
      | { update: { bio?: string | null; goals?: string | null; skills?: string | null; experience?: string | null } }
      | {
          create: { bio: string | null; goals: string | null; skills: string | null; experience: string | null }
        }
      | undefined

    if (valid.profile !== undefined && Object.keys(valid.profile).length > 0) {
      const p = valid.profile
      if (existing.profile) {
        const update: {
          bio?: string | null
          goals?: string | null
          skills?: string | null
          experience?: string | null
        } = {}
        if (p.bio !== undefined) update.bio = p.bio ?? null
        if (p.goals !== undefined) update.goals = p.goals ?? null
        if (p.skills !== undefined) update.skills = p.skills ?? null
        if (p.experience !== undefined) update.experience = p.experience ?? null
        if (Object.keys(update).length > 0) {
          profilePayload = { update }
        }
      } else {
        profilePayload = {
          create: {
            bio: p.bio ?? null,
            goals: p.goals ?? null,
            skills: p.skills ?? null,
            experience: p.experience ?? null
          }
        }
      }
    }

    const updated = await tx.participant.update({
      where: { id },
      data: {
        ...(valid.cohortId !== undefined ? { cohortId: valid.cohortId } : {}),
        ...(valid.status !== undefined ? { status: valid.status } : {}),
        ...(profilePayload ? { profile: profilePayload } : {})
      },
      include: participantInclude
    })

    return updated
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.UPDATE,
    entityType: 'Participant',
    entityId: participant.id,
    details: valid,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return participant
}

export async function deleteParticipant(
  participantId: string,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(participantId)
  const existing = await prisma.participant.findFirst({
    where: { id, cohort: { programme: { tenantId: context.tenantId } } }
  })
  if (!existing) {
    throw new Error('Participant not found.')
  }

  await prisma.participant.delete({ where: { id } })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.DELETE,
    entityType: 'Participant',
    entityId: id,
    details: { userId: existing.userId, cohortId: existing.cohortId },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return { id }
}

export async function upsertParticipantConsents(
  participantId: string,
  input: unknown,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(participantId)
  const row = await assertParticipantInTenant(id, context.tenantId)
  if (!row) {
    throw new Error('Participant not found.')
  }

  const { items } = consentBatchSchema.parse(input)

  const results = await prisma.$transaction(
    items.map((item) =>
      prisma.consentRecord.upsert({
        where: {
          participantId_type_version: {
            participantId: id,
            type: item.type,
            version: item.version
          }
        },
        create: {
          participantId: id,
          type: item.type,
          consented: item.consented,
          consentedAt: item.consented ? new Date() : null,
          version: item.version,
          ipAddress: item.ipAddress ?? null,
          userAgent: item.userAgent ?? null
        },
        update: {
          consented: item.consented,
          consentedAt: item.consented ? new Date() : null,
          ipAddress: item.ipAddress ?? null,
          userAgent: item.userAgent ?? null
        }
      })
    )
  )

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.UPDATE,
    entityType: 'ParticipantConsent',
    entityId: id,
    details: { items: items.map((i) => ({ type: i.type, version: i.version, consented: i.consented })) },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return results
}
