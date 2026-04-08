import { listAiSuggestions } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import {
  assertCohortAiAccess,
  assertEvidenceReviewAiAccess,
  assertEvidenceSubmissionAiAccess,
  assertParticipantAiAccess
} from '@/lib/ai-access'
import { requireSession } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth
  const url = new URL(request.url)
  const evidenceSubmissionId = url.searchParams.get('evidenceSubmissionId')?.trim() || undefined
  const evidenceReviewId = url.searchParams.get('evidenceReviewId')?.trim() || undefined
  const cohortId = url.searchParams.get('cohortId')?.trim() || undefined
  const participantId = url.searchParams.get('participantId')?.trim() || undefined
  const limitRaw = url.searchParams.get('limit')
  const limit = limitRaw ? Number(limitRaw) : undefined

  try {
    if (evidenceSubmissionId) {
      const gate = await assertEvidenceSubmissionAiAccess(session, evidenceSubmissionId)
      if ('error' in gate) {
        return gate.error
      }
    } else if (evidenceReviewId) {
      const gate = await assertEvidenceReviewAiAccess(session, evidenceReviewId)
      if ('error' in gate) {
        return gate.error
      }
    } else if (cohortId) {
      const gate = await assertCohortAiAccess(session, cohortId)
      if ('error' in gate) {
        return gate.error
      }
    } else if (participantId) {
      const gate = await assertParticipantAiAccess(session, participantId)
      if ('error' in gate) {
        return gate.error
      }
    } else {
      return NextResponse.json({ error: 'Missing entity filter query parameter.' }, { status: 400 })
    }

    const rows = await listAiSuggestions({
      tenantId: session.user.tenantId,
      evidenceSubmissionId,
      evidenceReviewId,
      cohortId,
      participantId,
      limit
    })

    return NextResponse.json({
      isAiSuggestion: true,
      items: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        text: r.outputText,
        structured: r.outputStructured,
        confidence: {
          score: r.confidenceScore,
          label: r.confidenceLabel,
          rationale: r.confidenceRationale
        },
        provider: r.provider,
        model: r.model,
        createdAt: r.createdAt.toISOString(),
        createdByUserId: r.createdByUserId
      }))
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
