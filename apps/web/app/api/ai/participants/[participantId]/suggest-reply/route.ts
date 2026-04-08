import { suggestParticipantReply } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { assertParticipantAiAccess } from '@/lib/ai-access'
import { requireSession } from '@/lib/api-auth'

type RouteContext = { params: { participantId: string } }

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const gate = await assertParticipantAiAccess(session, context.params.participantId)
  if ('error' in gate) {
    return gate.error
  }

  try {
    const body = await request.json().catch(() => ({}))
    const result = await suggestParticipantReply(context.params.participantId, body, {
      tenantId: session.user.tenantId,
      actingUserId: session.user.id
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
