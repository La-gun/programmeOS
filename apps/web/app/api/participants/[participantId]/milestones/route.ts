import {
  ensureParticipantMilestones,
  getParticipantById,
  listParticipantMilestones
} from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { canAccessParticipantRecord, canManageParticipants } from '@/lib/permissions'

type RouteContext = { params: { participantId: string } }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const participant = await getParticipantById(context.params.participantId, session.user.tenantId)
  if (!participant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!canAccessParticipantRecord(session.user.role, session.user.id, participant.userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const milestones = await listParticipantMilestones(participant.id, session.user.tenantId)
    return NextResponse.json(milestones)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const participant = await getParticipantById(context.params.participantId, session.user.tenantId)
  if (!participant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isSelf = session.user.role === 'PARTICIPANT' && session.user.id === participant.userId
  if (!canManageParticipants(session.user.role) && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const milestones = await ensureParticipantMilestones(participant.id, session.user.tenantId)
    return NextResponse.json(milestones)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
