import { assignEvidenceReviewer } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/api-auth'
import { canReviewEvidence } from '@/lib/permissions'

type RouteContext = { params: { submissionId: string } }

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  if (!canReviewEvidence(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const updated = await assignEvidenceReviewer(context.params.submissionId, body, {
      tenantId: session.user.tenantId,
      actingUserId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    const msg = String(error)
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Reviewer is already assigned to this submission.' }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
