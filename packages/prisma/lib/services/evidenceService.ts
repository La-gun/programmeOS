import {
  AuditAction,
  MilestoneStatus,
  ReviewStatus,
  SubmissionStatus
} from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { prisma } from '../client'
import { createAuditEvent } from './auditService'
import {
  assertUserCanReview,
  getParticipantMilestoneForTenant
} from './participantMilestoneService'
import {
  assignReviewerSchema,
  evidenceReviewDecisionSchema,
  evidenceSubmissionCreateSchema,
  evidenceSubmissionUpdateSchema,
  idSchema
} from './schemas'

/**
 * Deterministic evidence workflow (submission status + reviews):
 * - DRAFT → SUBMITTED (participant submit)
 * - SUBMITTED → UNDER_REVIEW (first reviewer assignment)
 * - UNDER_REVIEW → APPROVED when every assigned review is APPROVED
 * - UNDER_REVIEW → REJECTED if any review is REJECTED (pending assignments removed)
 * - UNDER_REVIEW → DRAFT if any review is REQUIRES_CHANGES (all reviews cleared for resubmission)
 */
const submissionInclude = {
  participantMilestone: {
    include: {
      participant: {
        select: {
          id: true,
          userId: true,
          cohort: {
            select: {
              programme: { select: { id: true, tenantId: true } }
            }
          }
        }
      },
      milestoneTemplate: { select: { id: true, name: true } }
    }
  },
  reviews: {
    include: { reviewer: { select: { id: true, name: true, email: true } } }
  }
} as const

export async function getEvidenceSubmissionById(submissionId: string, tenantId: string) {
  const id = idSchema.parse(submissionId)
  return prisma.evidenceSubmission.findFirst({
    where: {
      id,
      participantMilestone: { participant: { cohort: { programme: { tenantId } } } }
    },
    include: submissionInclude
  })
}

async function assertDocumentsForParticipant(
  documentIds: string[],
  participantId: string,
  tenantId: string
) {
  if (documentIds.length === 0) {
    return
  }
  const docs = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      tenantId,
      participantId
    },
    select: { id: true }
  })
  if (docs.length !== documentIds.length) {
    throw new Error('One or more documents are missing or do not belong to this participant.')
  }
}

export async function createEvidenceDraft(
  input: unknown,
  context: {
    tenantId: string
    participantUserId: string
    actingUserId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const valid = evidenceSubmissionCreateSchema.parse(input)
  const milestone = await getParticipantMilestoneForTenant(valid.participantMilestoneId, context.tenantId)
  if (!milestone) {
    throw new Error('Milestone not found.')
  }
  if (milestone.participant.userId !== context.participantUserId) {
    throw new Error('Forbidden.')
  }

  const submission = await prisma.$transaction(async (tx) => {
    if (milestone.status === MilestoneStatus.NOT_STARTED) {
      await tx.participantMilestone.update({
        where: { id: milestone.id },
        data: { status: MilestoneStatus.IN_PROGRESS, startedAt: new Date() }
      })
    }

    return tx.evidenceSubmission.create({
      data: {
        participantMilestoneId: milestone.id,
        title: valid.title,
        description: valid.description ?? null,
        status: SubmissionStatus.DRAFT,
        documents: []
      },
      include: submissionInclude
    })
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.actingUserId,
    action: AuditAction.CREATE,
    entityType: 'EvidenceSubmission',
    entityId: submission.id,
    details: { participantMilestoneId: milestone.id, title: valid.title },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return submission
}

export async function updateEvidenceDraft(
  submissionId: string,
  input: unknown,
  context: {
    tenantId: string
    participantUserId: string
    actingUserId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(submissionId)
  const valid = evidenceSubmissionUpdateSchema.parse(input)
  if (Object.keys(valid).length === 0) {
    throw new Error('No update payload provided.')
  }

  const existing = await getEvidenceSubmissionById(id, context.tenantId)
  if (!existing) {
    throw new Error('Evidence submission not found.')
  }
  if (existing.participantMilestone.participant.userId !== context.participantUserId) {
    throw new Error('Forbidden.')
  }
  if (existing.status !== SubmissionStatus.DRAFT) {
    throw new Error('Only draft submissions can be edited.')
  }

  if (valid.documentIds !== undefined) {
    await assertDocumentsForParticipant(
      valid.documentIds,
      existing.participantMilestone.participant.id,
      context.tenantId
    )
  }

  const updated = await prisma.evidenceSubmission.update({
    where: { id },
    data: {
      ...(valid.title !== undefined ? { title: valid.title } : {}),
      ...(valid.description !== undefined ? { description: valid.description ?? null } : {}),
      ...(valid.documentIds !== undefined ? { documents: valid.documentIds } : {})
    },
    include: submissionInclude
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.actingUserId,
    action: AuditAction.UPDATE,
    entityType: 'EvidenceSubmission',
    entityId: id,
    details: valid,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return updated
}

export async function appendDocumentToSubmission(
  submissionId: string,
  documentId: string,
  context: {
    tenantId: string
    participantUserId: string
    actingUserId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const sid = idSchema.parse(submissionId)
  const did = idSchema.parse(documentId)

  const existing = await getEvidenceSubmissionById(sid, context.tenantId)
  if (!existing) {
    throw new Error('Evidence submission not found.')
  }
  if (existing.participantMilestone.participant.userId !== context.participantUserId) {
    throw new Error('Forbidden.')
  }
  if (existing.status !== SubmissionStatus.DRAFT) {
    throw new Error('Evidence can only be attached while the submission is a draft.')
  }

  await assertDocumentsForParticipant([did], existing.participantMilestone.participant.id, context.tenantId)

  const nextDocs = Array.from(new Set([...existing.documents, did]))
  const updated = await prisma.evidenceSubmission.update({
    where: { id: sid },
    data: { documents: nextDocs },
    include: submissionInclude
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.actingUserId,
    action: AuditAction.UPDATE,
    entityType: 'EvidenceSubmission',
    entityId: sid,
    details: { documentAppended: did },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return updated
}

export async function submitEvidence(
  submissionId: string,
  context: {
    tenantId: string
    participantUserId: string
    actingUserId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(submissionId)
  const existing = await getEvidenceSubmissionById(id, context.tenantId)
  if (!existing) {
    throw new Error('Evidence submission not found.')
  }
  if (existing.participantMilestone.participant.userId !== context.participantUserId) {
    throw new Error('Forbidden.')
  }
  if (existing.status !== SubmissionStatus.DRAFT) {
    throw new Error('Only draft submissions can be submitted.')
  }
  if (existing.documents.length === 0) {
    throw new Error('Attach at least one document before submitting.')
  }

  const updated = await prisma.evidenceSubmission.update({
    where: { id },
    data: {
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date()
    },
    include: submissionInclude
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.actingUserId,
    action: AuditAction.SUBMIT_EVIDENCE,
    entityType: 'EvidenceSubmission',
    entityId: id,
    details: { title: existing.title, documentCount: existing.documents.length },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return updated
}

export async function assignEvidenceReviewer(
  submissionId: string,
  input: unknown,
  context: {
    tenantId: string
    actingUserId: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(submissionId)
  const { reviewerId } = assignReviewerSchema.parse(input)

  await assertUserCanReview(reviewerId, context.tenantId)

  const existing = await getEvidenceSubmissionById(id, context.tenantId)
  if (!existing) {
    throw new Error('Evidence submission not found.')
  }

  if (
    existing.status !== SubmissionStatus.SUBMITTED &&
    existing.status !== SubmissionStatus.UNDER_REVIEW
  ) {
    throw new Error('Reviewers can only be assigned to submitted evidence.')
  }

  const review = await prisma.$transaction(async (tx) => {
    const row = await tx.evidenceReview.create({
      data: {
        evidenceSubmissionId: id,
        reviewerId,
        status: ReviewStatus.PENDING
      }
    })

    if (existing.status === SubmissionStatus.SUBMITTED) {
      await tx.evidenceSubmission.update({
        where: { id },
        data: { status: SubmissionStatus.UNDER_REVIEW }
      })
    }

    return row
  })

  const full = await getEvidenceSubmissionById(id, context.tenantId)

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.actingUserId,
    action: AuditAction.UPDATE,
    entityType: 'EvidenceReviewAssignment',
    entityId: review.id,
    details: { evidenceSubmissionId: id, reviewerId },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return full
}

async function finalizeSubmissionAfterReview(tx: Prisma.TransactionClient, submissionId: string) {
  const submission = await tx.evidenceSubmission.findUnique({
    where: { id: submissionId },
    include: { reviews: true }
  })
  if (!submission || submission.reviews.length === 0) {
    return
  }

  if (submission.reviews.some((r) => r.status === ReviewStatus.REJECTED)) {
    await tx.evidenceReview.deleteMany({
      where: { evidenceSubmissionId: submissionId, status: ReviewStatus.PENDING }
    })
    await tx.evidenceSubmission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.REJECTED }
    })
    return
  }

  if (submission.reviews.some((r) => r.status === ReviewStatus.REQUIRES_CHANGES)) {
    await tx.evidenceReview.deleteMany({
      where: { evidenceSubmissionId: submissionId }
    })
    await tx.evidenceSubmission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.DRAFT, submittedAt: null }
    })
    return
  }

  const pending = submission.reviews.filter((r) => r.status === ReviewStatus.PENDING)
  const allApproved =
    pending.length === 0 && submission.reviews.every((r) => r.status === ReviewStatus.APPROVED)

  if (allApproved) {
    await tx.evidenceSubmission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.APPROVED }
    })
    await tx.participantMilestone.update({
      where: { id: submission.participantMilestoneId },
      data: {
        status: MilestoneStatus.COMPLETED,
        completedAt: new Date()
      }
    })
  }
}

export async function applyEvidenceReviewDecision(
  reviewId: string,
  input: unknown,
  context: {
    tenantId: string
    reviewerUserId: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(reviewId)
  const valid = evidenceReviewDecisionSchema.parse(input)

  const review = await prisma.evidenceReview.findFirst({
    where: {
      id,
      reviewerId: context.reviewerUserId,
      evidenceSubmission: {
        participantMilestone: { participant: { cohort: { programme: { tenantId: context.tenantId } } } }
      }
    },
    include: {
      evidenceSubmission: { select: { id: true, status: true } }
    }
  })

  if (!review) {
    throw new Error('Review assignment not found.')
  }
  if (review.status !== ReviewStatus.PENDING) {
    throw new Error('This review has already been completed.')
  }
  if (review.evidenceSubmission.status !== SubmissionStatus.UNDER_REVIEW) {
    throw new Error('Submission is not under review.')
  }

  let nextReviewStatus: ReviewStatus
  if (valid.decision === 'approve') {
    nextReviewStatus = ReviewStatus.APPROVED
  } else if (valid.decision === 'reject') {
    nextReviewStatus = ReviewStatus.REJECTED
  } else {
    nextReviewStatus = ReviewStatus.REQUIRES_CHANGES
  }

  await prisma.$transaction(async (tx) => {
    await tx.evidenceReview.update({
      where: { id },
      data: {
        status: nextReviewStatus,
        feedback: valid.feedback ?? null,
        reviewedAt: new Date()
      }
    })
    await finalizeSubmissionAfterReview(tx, review.evidenceSubmission.id)
  })

  const submissionId = review.evidenceSubmission.id

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.reviewerUserId,
    action: AuditAction.REVIEW_EVIDENCE,
    entityType: 'EvidenceReview',
    entityId: id,
    details: {
      evidenceSubmissionId: submissionId,
      decision: valid.decision,
      feedback: valid.feedback ?? null
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return getEvidenceSubmissionById(submissionId, context.tenantId)
}

export async function listMyReviewQueue(reviewerUserId: string, tenantId: string) {
  return prisma.evidenceReview.findMany({
    where: {
      reviewerId: reviewerUserId,
      status: ReviewStatus.PENDING,
      evidenceSubmission: {
        status: SubmissionStatus.UNDER_REVIEW,
        participantMilestone: { participant: { cohort: { programme: { tenantId } } } }
      }
    },
    orderBy: { id: 'asc' },
    include: {
      evidenceSubmission: {
        include: {
          participantMilestone: {
            include: {
              milestoneTemplate: { select: { id: true, name: true } },
              participant: {
                select: {
                  id: true,
                  user: { select: { id: true, name: true, email: true } }
                }
              }
            }
          }
        }
      }
    }
  })
}

export async function listSubmittedEvidenceAwaitingAssignment(tenantId: string) {
  return prisma.evidenceSubmission.findMany({
    where: {
      status: SubmissionStatus.SUBMITTED,
      participantMilestone: { participant: { cohort: { programme: { tenantId } } } }
    },
    orderBy: { submittedAt: 'asc' },
    include: {
      participantMilestone: {
        include: {
          milestoneTemplate: { select: { id: true, name: true } },
          participant: {
            select: {
              id: true,
              user: { select: { id: true, name: true, email: true } }
            }
          }
        }
      },
      reviews: { select: { id: true, reviewerId: true, status: true } }
    }
  })
}

export async function getEvidenceReviewInTenant(reviewId: string, tenantId: string) {
  const id = idSchema.parse(reviewId)
  return prisma.evidenceReview.findFirst({
    where: {
      id,
      evidenceSubmission: {
        participantMilestone: { participant: { cohort: { programme: { tenantId } } } }
      }
    },
    include: {
      reviewer: { select: { id: true, name: true, email: true } },
      evidenceSubmission: {
        include: {
          participantMilestone: {
            include: {
              milestoneTemplate: { select: { id: true, name: true } },
              participant: {
                select: {
                  id: true,
                  user: { select: { id: true, name: true, email: true } }
                }
              }
            }
          },
          reviews: {
            include: { reviewer: { select: { id: true, name: true, email: true } } }
          }
        }
      }
    }
  })
}

export async function listTenantUsersEligibleReviewers(tenantId: string) {
  return prisma.user.findMany({
    where: {
      memberships: {
        some: {
          tenantId,
          role: { in: ['ADMIN', 'MANAGER', 'FACILITATOR'] }
        }
      }
    },
    select: { id: true, name: true, email: true },
    orderBy: { email: 'asc' }
  })
}
