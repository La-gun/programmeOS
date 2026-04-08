import { createParticipant, getParticipantList } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireParticipantManager, requireSession } from '@/lib/api-auth'
import { canManageParticipants } from '@/lib/permissions'

export async function GET(request: Request) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  if (!canManageParticipants(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const cohortId = url.searchParams.get('cohortId') ?? undefined
  const search = url.searchParams.get('q') ?? undefined

  const participants = await getParticipantList(session.user.tenantId, { cohortId, search })
  return NextResponse.json(participants)
}

export async function POST(request: Request) {
  const auth = await requireParticipantManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  try {
    const payload = await request.json()
    const participant = await createParticipant(payload, {
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
