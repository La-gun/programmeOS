import {
  MessageDirection,
  MessageType,
  MessagingChannel,
  Prisma
} from '@prisma/client'
import { prisma } from '../client'

export type InboundChannelMessageInput = {
  tenantId: string
  channel: MessagingChannel
  /** Normalised address (e.g. E.164) */
  fromAddress: string
  providerMessageId: string
  text: string
  externalThreadId?: string
}

export type ProcessInboundResult =
  | { ok: true; conversationId: string; messageEventId: string; duplicate: false }
  | { ok: true; duplicate: true; conversationId?: string; messageEventId?: string }
  | { ok: false; code: 'unknown_participant' | 'invalid_payload' | 'persist_failed'; message: string }

async function getTenantBotUserId(tenantId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: {
      tenantId,
      memberships: { some: { tenantId, role: 'ADMIN' } }
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' }
  })
  return user?.id ?? null
}

export async function getOrCreateChannelConversation(
  tenantId: string,
  participantId: string,
  channel: MessagingChannel,
  externalThreadId?: string
) {
  const existing = await prisma.conversation.findUnique({
    where: {
      tenantId_participantId_channel: {
        tenantId,
        participantId,
        channel
      }
    }
  })
  if (existing) {
    if (externalThreadId && !existing.externalThreadId) {
      return prisma.conversation.update({
        where: { id: existing.id },
        data: { externalThreadId }
      })
    }
    return existing
  }

  const conv = await prisma.conversation.create({
    data: {
      tenantId,
      participantId,
      channel,
      externalThreadId: externalThreadId ?? null,
      title: channel === MessagingChannel.WHATSAPP ? `WhatsApp` : null
    }
  })

  await prisma.messagingSessionState.create({
    data: {
      conversationId: conv.id,
      stateKey: 'idle',
      data: {}
    }
  })

  return conv
}

async function bumpSessionAfterInbound(conversationId: string, preview: string) {
  const row = await prisma.messagingSessionState.findUnique({
    where: { conversationId }
  })
  const prev = (row?.data as Record<string, unknown> | null) ?? {}
  const inboundCount = typeof prev.inboundCount === 'number' ? prev.inboundCount + 1 : 1

  await prisma.messagingSessionState.upsert({
    where: { conversationId },
    create: {
      conversationId,
      stateKey: 'idle',
      data: {
        inboundCount,
        lastInboundPreview: preview.slice(0, 200),
        lastInboundAt: new Date().toISOString()
      }
    },
    update: {
      stateKey: row?.stateKey ?? 'idle',
      data: {
        ...prev,
        inboundCount,
        lastInboundPreview: preview.slice(0, 200),
        lastInboundAt: new Date().toISOString()
      } as Prisma.InputJsonValue
    }
  })
}

export async function processInboundChannelMessage(
  input: InboundChannelMessageInput
): Promise<ProcessInboundResult> {
  if (!input.text?.trim() || !input.providerMessageId?.trim()) {
    return { ok: false, code: 'invalid_payload', message: 'text and providerMessageId are required' }
  }

  const participantId = await prisma.participantChannelAddress.findFirst({
    where: {
      tenantId: input.tenantId,
      channel: input.channel,
      address: input.fromAddress
    },
    select: { participantId: true, participant: { select: { userId: true } } }
  })

  if (!participantId) {
    return { ok: false, code: 'unknown_participant', message: 'No participant mapped to this address' }
  }

  const conversation = await getOrCreateChannelConversation(
    input.tenantId,
    participantId.participantId,
    input.channel,
    input.externalThreadId
  )

  try {
    const message = await prisma.messageEvent.create({
      data: {
        conversationId: conversation.id,
        senderId: participantId.participant.userId,
        direction: MessageDirection.INBOUND,
        providerMessageId: input.providerMessageId,
        type: MessageType.TEXT,
        content: input.text.trim(),
        metadata: { channel: input.channel, fromAddress: input.fromAddress }
      }
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    })

    await bumpSessionAfterInbound(conversation.id, input.text.trim())

    return {
      ok: true,
      duplicate: false,
      conversationId: conversation.id,
      messageEventId: message.id
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: true, duplicate: true }
    }
    return {
      ok: false,
      code: 'persist_failed',
      message: e instanceof Error ? e.message : String(e)
    }
  }
}

export type OutboundChannelMessageInput = {
  tenantId: string
  participantId: string
  channel: MessagingChannel
  text: string
  /** User performing the action (dashboard); falls back to tenant bot user */
  actorUserId?: string
  /** Id returned by the provider after send (optional until provider responds) */
  providerMessageId?: string
}

export async function persistOutboundChannelMessage(
  input: OutboundChannelMessageInput
): Promise<{ conversationId: string; messageEventId: string }> {
  const conversation = await getOrCreateChannelConversation(
    input.tenantId,
    input.participantId,
    input.channel
  )

  let senderId = input.actorUserId ?? null
  if (!senderId) {
    senderId = await getTenantBotUserId(input.tenantId)
  }
  if (!senderId) {
    throw new Error('No sender user: pass actorUserId or ensure an ADMIN exists in the tenant')
  }

  const message = await prisma.messageEvent.create({
    data: {
      conversationId: conversation.id,
      senderId,
      direction: MessageDirection.OUTBOUND,
      providerMessageId: input.providerMessageId ?? null,
      type: MessageType.TEXT,
      content: input.text.trim(),
      metadata: { channel: input.channel }
    }
  })

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  })

  const row = await prisma.messagingSessionState.findUnique({
    where: { conversationId: conversation.id }
  })
  const prev = (row?.data as Record<string, unknown> | null) ?? {}
  const outboundCount = typeof prev.outboundCount === 'number' ? prev.outboundCount + 1 : 1

  await prisma.messagingSessionState.upsert({
    where: { conversationId: conversation.id },
    create: {
      conversationId: conversation.id,
      stateKey: 'idle',
      data: {
        outboundCount,
        lastOutboundPreview: input.text.trim().slice(0, 200),
        lastOutboundAt: new Date().toISOString()
      }
    },
    update: {
      data: {
        ...prev,
        outboundCount,
        lastOutboundPreview: input.text.trim().slice(0, 200),
        lastOutboundAt: new Date().toISOString()
      } as Prisma.InputJsonValue
    }
  })

  return { conversationId: conversation.id, messageEventId: message.id }
}

