import { summarizeEvidence } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { assertEvidenceSubmissionAiAccess } from '@/lib/ai-access'
import { requireSession } from '@/lib/api-auth'

type RouteContext = { params: { submissionId: string } }

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const gate = await assertEvidenceSubmissionAiAccess(session, context.params.submissionId)
  if ('error' in gate) {
    return gate.error
  }

  try {
    const result = await summarizeEvidence(context.params.submissionId, {
      tenantId: session.user.tenantId,
      actingUserId: session.user.id
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
