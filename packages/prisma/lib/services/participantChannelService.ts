import { MessagingChannel } from '@prisma/client'
import { prisma } from '../client'
import { idSchema, participantChannelAddressUpsertSchema } from './schemas'

export async function findParticipantIdByChannelAddress(
  tenantId: string,
  channel: MessagingChannel,
  address: string
) {
  const row = await prisma.participantChannelAddress.findFirst({
    where: { tenantId, channel, address },
    select: { participantId: true }
  })
  return row?.participantId ?? null
}

export async function getParticipantChannelAddress(
  tenantId: string,
  participantId: string,
  channel: MessagingChannel
) {
  const pid = idSchema.parse(participantId)
  return prisma.participantChannelAddress.findFirst({
    where: { tenantId, participantId: pid, channel },
    include: {
      participant: {
        select: {
          id: true,
          userId: true,
          cohort: { select: { name: true, programme: { select: { name: true } } } }
        }
      }
    }
  })
}

export async function upsertParticipantChannelAddress(
  tenantId: string,
  participantId: string,
  raw: unknown
) {
  const pid = idSchema.parse(participantId)
  const parsed = participantChannelAddressUpsertSchema.parse(raw)

  const participant = await prisma.participant.findFirst({
    where: { id: pid, cohort: { programme: { tenantId } } },
    select: { id: true }
  })
  if (!participant) {
    throw new Error('Participant not found in tenant')
  }

  return prisma.participantChannelAddress.upsert({
    where: {
      participantId_channel: {
        participantId: pid,
        channel: parsed.channel
      }
    },
    create: {
      tenantId,
      participantId: pid,
      channel: parsed.channel,
      address: parsed.address
    },
    update: {
      address: parsed.address
    }
  })
}

export async function listParticipantChannelAddresses(tenantId: string, participantId: string) {
  const pid = idSchema.parse(participantId)
  return prisma.participantChannelAddress.findMany({
    where: { tenantId, participantId: pid },
    orderBy: { channel: 'asc' }
  })
}
