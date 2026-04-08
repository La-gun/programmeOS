import {
  applyEvidenceReviewDecision,
  getEvidenceReviewInTenant,
  listDocumentsByIds
} from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/api-auth'
import { canManageParticipants, canReviewEvidence } from '@/lib/permissions'

type RouteContext = { params: { reviewId: string } }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  if (!canReviewEvidence(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const review = await getEvidenceReviewInTenant(context.params.reviewId, session.user.tenantId)
  if (!review) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isAssignee = review.reviewerId === session.user.id
  if (!isAssignee && !canManageParticipants(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const documentRecords = await listDocumentsByIds(
    review.evidenceSubmission.documents,
    session.user.tenantId
  )

  return NextResponse.json({ ...review, documentRecords })
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  if (!canReviewEvidence(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const submission = await applyEvidenceReviewDecision(context.params.reviewId, body, {
      tenantId: session.user.tenantId,
      reviewerUserId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(submission)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
