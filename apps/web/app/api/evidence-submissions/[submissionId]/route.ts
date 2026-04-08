import {
  getEvidenceSubmissionById,
  listDocumentsByIds,
  updateEvidenceDraft
} from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { z } from 'zod'
import { requireSession } from '@/lib/api-auth'
import { canAccessParticipantRecord, canManageParticipants } from '@/lib/permissions'

type RouteContext = { params: { submissionId: string } }

async function assertCanViewSubmission(session: Session, submissionId: string) {
  const submission = await getEvidenceSubmissionById(submissionId, session.user.tenantId)
  if (!submission) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) as const
  }
  const participantUserId = submission.participantMilestone.participant.userId
  if (
    !canManageParticipants(session.user.role) &&
    !canAccessParticipantRecord(session.user.role, session.user.id, participantUserId)
  ) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) as const
  }
  return { submission } as const
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const result = await assertCanViewSubmission(session, context.params.submissionId)
  if ('error' in result) {
    return result.error
  }
  const docs = await listDocumentsByIds(result.submission.documents, session.user.tenantId)
  return NextResponse.json({ ...result.submission, documentRecords: docs })
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const result = await assertCanViewSubmission(session, context.params.submissionId)
  if ('error' in result) {
    return result.error
  }
  const participantUserId = result.submission.participantMilestone.participant.userId
  if (session.user.id !== participantUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const payload = await request.json()
    const updated = await updateEvidenceDraft(context.params.submissionId, payload, {
      tenantId: session.user.tenantId,
      participantUserId: session.user.id,
      actingUserId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
