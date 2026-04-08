import { MessagingChannel } from '@prisma/client'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/api-auth'
import { canManageParticipants } from '@/lib/permissions'
import { sendOutboundToParticipant } from '@/lib/messaging/outbound'

const bodySchema = z.object({
  participantId: z.string().trim().min(1),
  channel: z.nativeEnum(MessagingChannel).default(MessagingChannel.WHATSAPP),
  text: z.string().trim().min(1).max(4096)
})

export async function POST(request: Request) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth
  if (!canManageParticipants(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const json = await request.json()
    const body = bodySchema.parse(json)
    const result = await sendOutboundToParticipant({
      tenantId: session.user.tenantId,
      participantId: body.participantId,
      channel: body.channel,
      text: body.text,
      actorUserId: session.user.id
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
