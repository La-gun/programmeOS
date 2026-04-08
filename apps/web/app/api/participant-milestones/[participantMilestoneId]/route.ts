import { updateParticipantMilestone } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/api-auth'
import { canManageParticipants } from '@/lib/permissions'

type RouteContext = { params: { participantMilestoneId: string } }

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
    const updated = await updateParticipantMilestone(context.params.participantMilestoneId, payload, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
