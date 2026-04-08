import { MessagingChannel } from '@prisma/client'
import { MockWhatsAppProvider } from './mock-whatsapp-provider'
import { WhatsAppCloudProvider } from './whatsapp-cloud-provider'
import type { MessagingChannelProvider } from './types'

/**
 * When `WHATSAPP_MOCK_MODE` is not `false`, outbound sends use the mock provider.
 * Set `WHATSAPP_MOCK_MODE=false` plus Cloud env vars to send via Meta Graph API.
 */
export function getWhatsAppProvider(): MessagingChannelProvider {
  const mockDisabled = process.env.WHATSAPP_MOCK_MODE === 'false'
  if (!mockDisabled) {
    return new MockWhatsAppProvider()
  }
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN?.trim()
  const graphVersion = process.env.META_GRAPH_API_VERSION?.trim()
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WHATSAPP_MOCK_MODE=false requires META_WHATSAPP_PHONE_NUMBER_ID and META_WHATSAPP_ACCESS_TOKEN'
    )
  }
  return new WhatsAppCloudProvider({
    phoneNumberId,
    accessToken,
    graphVersion: graphVersion || undefined
  })
}

export function getProviderForChannel(channel: MessagingChannel): MessagingChannelProvider {
  if (channel === MessagingChannel.WHATSAPP) {
    return getWhatsAppProvider()
  }
  throw new Error(`No messaging provider for channel ${channel}`)
}
