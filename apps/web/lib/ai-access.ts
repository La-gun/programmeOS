import type { Session } from 'next-auth'
import {
  getCohortById,
  getEvidenceReviewInTenant,
  getEvidenceSubmissionById,
  getParticipantById
} from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import {
  canAccessParticipantRecord,
  canManageCohorts,
  canManageParticipants,
  canReviewEvidence
} from '@/lib/permissions'

export async function assertEvidenceSubmissionAiAccess(session: Session, submissionId: string) {
  const submission = await getEvidenceSubmissionById(submissionId, session.user.tenantId)
  if (!submission) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) as const }
  }
  const participantUserId = submission.participantMilestone.participant.userId
  if (
    !canManageParticipants(session.user.role) &&
    !canAccessParticipantRecord(session.user.role, session.user.id, participantUserId)
  ) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) as const }
  }
  return { submission } as const
}

export async function assertEvidenceReviewAiAccess(session: Session, reviewId: string) {
  if (!canReviewEvidence(session.user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) as const }
  }
  const review = await getEvidenceReviewInTenant(reviewId, session.user.tenantId)
  if (!review) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) as const }
  }
  const isAssignee = review.reviewerId === session.user.id
  if (!isAssignee && !canManageParticipants(session.user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) as const }
  }
  return { review } as const
}

export async function assertCohortAiAccess(session: Session, cohortId: string) {
  if (!canManageCohorts(session.user.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) as const }
  }
  const cohort = await getCohortById(cohortId, session.user.tenantId)
  if (!cohort) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) as const }
  }
  return { cohort } as const
}

export async function assertParticipantAiAccess(session: Session, participantId: string) {
  const participant = await getParticipantById(participantId, session.user.tenantId)
  if (!participant) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) as const }
  }
  if (!canAccessParticipantRecord(session.user.role, session.user.id, participant.userId)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) as const }
  }
  return { participant } as const
}
