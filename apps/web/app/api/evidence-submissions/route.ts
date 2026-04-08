import { createEvidenceDraft, getParticipantMilestoneForTenant } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/api-auth'

export async function POST(request: Request) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  try {
    const body = await request.json()
    const participantMilestoneId =
      typeof body?.participantMilestoneId === 'string' ? body.participantMilestoneId : ''
    const milestoneRow = await getParticipantMilestoneForTenant(
      participantMilestoneId,
      session.user.tenantId
    )
    if (!milestoneRow) {
      return NextResponse.json({ error: 'Milestone not found.' }, { status: 404 })
    }
    if (milestoneRow.participant.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const submission = await createEvidenceDraft(body, {
      tenantId: session.user.tenantId,
      participantUserId: session.user.id,
      actingUserId: session.user.id,
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
