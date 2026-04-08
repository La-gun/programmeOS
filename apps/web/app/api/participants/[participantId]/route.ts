import { deleteParticipant, getParticipantById, updateParticipant } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/api-auth'
import { canAccessParticipantRecord, canManageParticipants } from '@/lib/permissions'

type RouteContext = { params: { participantId: string } }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  const participant = await getParticipantById(context.params.participantId, session.user.tenantId)
  if (!participant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (
    !canAccessParticipantRecord(session.user.role, session.user.id, participant.userId)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(participant)
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  if (!canManageParticipants(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const payload = await request.json()
    const participant = await updateParticipant(context.params.participantId, payload, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(participant)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  if (!canManageParticipants(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await deleteParticipant(context.params.participantId, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
