import type { MessagingChannel } from '@prisma/client'

export type MessagingProviderName = 'whatsapp_cloud' | 'mock_whatsapp'

export type SendChannelTextParams = {
  toAddress: string
  text: string
  metadata?: Record<string, unknown>
}

export type SendChannelTextResult = {
  providerMessageId: string
}

/**
 * Outbound channel adapter (WhatsApp Cloud API, Twilio, mock, etc.).
 */
export interface MessagingChannelProvider {
  readonly name: MessagingProviderName
  readonly channel: MessagingChannel
  sendText(params: SendChannelTextParams): Promise<SendChannelTextResult>
}

export type NormalisedInboundMessage = {
  providerMessageId: string
  fromAddress: string
  text: string
  /** WhatsApp Cloud: messages[].id */
  externalThreadId?: string
  /** WhatsApp Cloud: metadata.phone_number_id */
  phoneNumberId?: string
}
