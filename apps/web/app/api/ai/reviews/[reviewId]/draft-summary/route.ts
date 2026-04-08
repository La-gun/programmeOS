import { draftReviewerSummary } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { assertEvidenceReviewAiAccess } from '@/lib/ai-access'
import { requireSession } from '@/lib/api-auth'

type RouteContext = { params: { reviewId: string } }

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const gate = await assertEvidenceReviewAiAccess(session, context.params.reviewId)
  if ('error' in gate) {
    return gate.error
  }

  try {
    const result = await draftReviewerSummary(context.params.reviewId, {
      tenantId: session.user.tenantId,
      actingUserId: session.user.id
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
