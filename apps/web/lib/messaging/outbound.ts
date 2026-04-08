import {
  MessagingChannel,
  persistOutboundChannelMessage,
  getParticipantChannelAddress
} from '@programmeos/prisma'
import { getProviderForChannel } from './provider-factory'

export type SendOutboundToParticipantInput = {
  tenantId: string
  participantId: string
  channel: MessagingChannel
  text: string
  actorUserId?: string
}

/**
 * Sends via the configured channel provider and persists an OUTBOUND `MessageEvent`.
 */
export async function sendOutboundToParticipant(input: SendOutboundToParticipantInput) {
  const mapping = await getParticipantChannelAddress(
    input.tenantId,
    input.participantId,
    input.channel
  )
  if (!mapping) {
    throw new Error(`No ${input.channel} address mapped for this participant`)
  }

  const provider = getProviderForChannel(input.channel)
  const sendResult = await provider.sendText({
    toAddress: mapping.address,
    text: input.text,
    metadata: { participantId: input.participantId, tenantId: input.tenantId }
  })

  const persisted = await persistOutboundChannelMessage({
    tenantId: input.tenantId,
    participantId: input.participantId,
    channel: input.channel,
    text: input.text,
    actorUserId: input.actorUserId,
    providerMessageId: sendResult.providerMessageId
  })

  return { ...persisted, providerMessageId: sendResult.providerMessageId }
}
