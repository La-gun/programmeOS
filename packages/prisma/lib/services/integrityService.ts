import {
  AuditAction,
  IntegrityCaseStatus,
  IntegrityRuleCode,
  MessagingChannel,
  SubmissionStatus,
  type Prisma
} from '@prisma/client'
import { prisma } from '../client'
import { createAuditEvent } from './auditService'
import {
  SUBMISSION_VELOCITY_THRESHOLD,
  SUBMISSION_VELOCITY_WINDOW_HOURS
} from './integrityRuleDefinitions'
import { idSchema, integrityCaseUpdateSchema } from './schemas'

type SubmissionForIntegrity = {
  id: string
  participantMilestone: { participant: { id: string } }
}

type FlagDraft = {
  ruleCode: IntegrityRuleCode
  summary: string
  explanation: string
  metadata: Record<string, unknown>
}

async function collectDuplicatePhoneFlag(
  tx: Prisma.TransactionClient,
  tenantId: string,
  participantId: string
): Promise<FlagDraft | null> {
  const channelRow = await tx.participantChannelAddress.findFirst({
    where: { tenantId, participantId, channel: MessagingChannel.WHATSAPP },
    select: { address: true }
  })
  if (!channelRow) {
    return null
  }

  const duplicates = await tx.participantChannelAddress.findMany({
    where: {
      tenantId,
      channel: MessagingChannel.WHATSAPP,
      address: channelRow.address,
      participantId: { not: participantId }
    },
    select: { participantId: true },
    distinct: ['participantId']
  })

  if (duplicates.length === 0) {
    return null
  }

  const otherIds = duplicates.map((d) => d.participantId)
  const plural = duplicates.length === 1 ? 'profile' : 'profiles'
  return {
    ruleCode: IntegrityRuleCode.DUPLICATE_PHONE,
    summary: `WhatsApp number also on ${duplicates.length} other participant ${plural}`,
    explanation:
      `This submission is from a participant whose WhatsApp number on file matches ${duplicates.length} other participant ${plural} in your workspace. ` +
      'One number normally maps to one person, so overlaps are worth verifying (duplicate enrolment, family sharing a phone, or a data entry mistake).',
    metadata: {
      channel: 'WHATSAPP',
      normalisedAddress: channelRow.address,
      otherParticipantIds: otherIds
    }
  }
}

async function collectSubmissionVelocityFlag(
  tx: Prisma.TransactionClient,
  participantId: string,
  submissionId: string
): Promise<FlagDraft | null> {
  const since = new Date(Date.now() - SUBMISSION_VELOCITY_WINDOW_HOURS * 60 * 60 * 1000)
  const count = await tx.evidenceSubmission.count({
    where: {
      submittedAt: { gte: since },
      participantMilestone: { participantId },
      status: { not: SubmissionStatus.DRAFT }
    }
  })

  if (count < SUBMISSION_VELOCITY_THRESHOLD) {
    return null
  }

  return {
    ruleCode: IntegrityRuleCode.SUBMISSION_VELOCITY,
    summary: `${count} submitted evidence packages in the last ${SUBMISSION_VELOCITY_WINDOW_HOURS} hours`,
    explanation:
      `Including this one, this participant has ${count} evidence submissions that reached submitted status within the last ${SUBMISSION_VELOCITY_WINDOW_HOURS} hours. ` +
      `The automated rule flags when the count is ${SUBMISSION_VELOCITY_THRESHOLD} or higher in that window. ` +
      'That pace is higher than most individual learners sustain, so it is surfaced for a quick human review (it can still be legitimate).',
    metadata: {
      windowHours: SUBMISSION_VELOCITY_WINDOW_HOURS,
      threshold: SUBMISSION_VELOCITY_THRESHOLD,
      submissionCountInWindow: count,
      submissionId
    }
  }
}

/**
 * Runs deterministic, rules-based checks after an evidence package is submitted.
 * Opens one case per submission when at least one rule matches; each match becomes a persisted flag with a plain-English explanation.
 */
export async function evaluateIntegrityAfterEvidenceSubmit(
  tx: Prisma.TransactionClient,
  submission: SubmissionForIntegrity,
  tenantId: string,
  audit: { userId?: string; ipAddress?: string; userAgent?: string }
) {
  const participantId = submission.participantMilestone.participant.id
  const existingCase = await tx.integrityCase.findFirst({
    where: { triggerEvidenceSubmissionId: submission.id },
    select: { id: true }
  })
  if (existingCase) {
    return null
  }

  const flags: FlagDraft[] = []
  const dup = await collectDuplicatePhoneFlag(tx, tenantId, participantId)
  if (dup) {
    flags.push(dup)
  }
  const vel = await collectSubmissionVelocityFlag(tx, participantId, submission.id)
  if (vel) {
    flags.push(vel)
  }

  if (flags.length === 0) {
    return null
  }

  const created = await tx.integrityCase.create({
    data: {
      tenantId,
      status: IntegrityCaseStatus.OPEN,
      triggerEvidenceSubmissionId: submission.id,
      primaryParticipantId: participantId,
      flags: {
        create: flags.map((f) => ({
          tenantId,
          ruleCode: f.ruleCode,
          summary: f.summary,
          explanation: f.explanation,
          metadata: f.metadata,
          evidenceSubmissionId: submission.id,
          participantId
        })) as Prisma.IntegrityFlagUncheckedCreateWithoutCaseInput[]
      }
    },
    include: { flags: true }
  })

  await createAuditEvent(
    {
      tenantId,
      userId: audit.userId,
      action: AuditAction.INTEGRITY_CASE_OPENED,
      entityType: 'IntegrityCase',
      entityId: created.id,
      details: {
        triggerEvidenceSubmissionId: submission.id,
        primaryParticipantId: participantId,
        rules: flags.map((f) => f.ruleCode),
        flagIds: created.flags.map((fl) => fl.id)
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent
    },
    tx
  )

  for (const fl of created.flags) {
    await createAuditEvent(
      {
        tenantId,
        userId: audit.userId,
        action: AuditAction.INTEGRITY_FLAG_RAISED,
        entityType: 'IntegrityFlag',
        entityId: fl.id,
        details: {
          integrityCaseId: created.id,
          ruleCode: fl.ruleCode,
          summary: fl.summary,
          evidenceSubmissionId: fl.evidenceSubmissionId,
          participantId: fl.participantId
        },
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent
      },
      tx
    )
  }

  return created
}

const caseListInclude = {
  primaryParticipant: {
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true } }
    }
  },
  triggerEvidenceSubmission: {
    select: { id: true, title: true, submittedAt: true, status: true }
  },
  resolvedBy: { select: { id: true, name: true, email: true } },
  flags: { select: { id: true, ruleCode: true, summary: true, explanation: true, metadata: true } }
} as const

export async function listIntegrityCases(
  tenantId: string,
  filters?: { status?: IntegrityCaseStatus }
) {
  return prisma.integrityCase.findMany({
    where: {
      tenantId,
      ...(filters?.status ? { status: filters.status } : {})
    },
    orderBy: { createdAt: 'desc' },
    include: caseListInclude
  })
}

export async function getIntegrityCaseById(caseId: string, tenantId: string) {
  const id = idSchema.parse(caseId)
  return prisma.integrityCase.findFirst({
    where: { id, tenantId },
    include: {
      primaryParticipant: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } }
        }
      },
      triggerEvidenceSubmission: {
        select: { id: true, title: true, submittedAt: true, status: true }
      },
      flags: { orderBy: { createdAt: 'asc' } },
      resolvedBy: { select: { id: true, name: true, email: true } }
    }
  })
}

export async function closeIntegrityCase(
  caseId: string,
  input: unknown,
  context: {
    tenantId: string
    actingUserId: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(caseId)
  const valid = integrityCaseUpdateSchema.parse(input)

  const row = await prisma.integrityCase.findFirst({
    where: { id, tenantId: context.tenantId },
    select: { id: true, status: true }
  })
  if (!row) {
    throw new Error('Integrity case not found.')
  }
  if (row.status !== IntegrityCaseStatus.OPEN) {
    throw new Error('Only open cases can be closed.')
  }

  const nextStatus =
    valid.status === 'RESOLVED' ? IntegrityCaseStatus.RESOLVED : IntegrityCaseStatus.DISMISSED
  const auditAction =
    valid.status === 'RESOLVED' ? AuditAction.INTEGRITY_CASE_RESOLVED : AuditAction.INTEGRITY_CASE_DISMISSED

  const updated = await prisma.integrityCase.update({
    where: { id },
    data: {
      status: nextStatus,
      resolvedAt: new Date(),
      resolvedById: context.actingUserId,
      resolutionNote: valid.resolutionNote ?? null
    },
    include: {
      primaryParticipant: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } }
        }
      },
      triggerEvidenceSubmission: {
        select: { id: true, title: true, submittedAt: true, status: true }
      },
      flags: { orderBy: { createdAt: 'asc' } },
      resolvedBy: { select: { id: true, name: true, email: true } }
    }
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.actingUserId,
    action: auditAction,
    entityType: 'IntegrityCase',
    entityId: id,
    details: {
      resolutionNote: valid.resolutionNote ?? null,
      previousStatus: IntegrityCaseStatus.OPEN
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return updated
}
