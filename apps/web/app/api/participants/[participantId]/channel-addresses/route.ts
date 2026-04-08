import {
  listParticipantChannelAddresses,
  upsertParticipantChannelAddress
} from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireParticipantManager, requireSession } from '@/lib/api-auth'
import { canManageParticipants } from '@/lib/permissions'

type RouteContext = { params: { participantId: string } }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth
  if (!canManageParticipants(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { participantId } = context.params
  const rows = await listParticipantChannelAddresses(session.user.tenantId, participantId)
  return NextResponse.json(rows)
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireParticipantManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth
  const { participantId } = context.params

  try {
    const payload = await request.json()
    const row = await upsertParticipantChannelAddress(session.user.tenantId, participantId, payload)
    return NextResponse.json(row)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
