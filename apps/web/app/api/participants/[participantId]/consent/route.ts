import { getParticipantById, upsertParticipantConsents } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/api-auth'
import { canManageParticipants } from '@/lib/permissions'

type RouteContext = { params: { participantId: string } }

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  const participant = await getParticipantById(context.params.participantId, session.user.tenantId)
  if (!participant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isSelf =
    session.user.role === 'PARTICIPANT' && session.user.id === participant.userId
  if (!canManageParticipants(session.user.role) && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const payload = await request.json()
    const records = await upsertParticipantConsents(context.params.participantId, payload, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(records)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
