import { MessagingChannel } from '@prisma/client'
import { MockWhatsAppProvider } from './mock-whatsapp-provider'
import type { MessagingChannelProvider } from './types'

/**
 * When `WHATSAPP_MOCK_MODE` is not `false`, outbound sends use the mock provider.
 * Real WhatsApp Cloud wiring can replace this factory later without changing call sites.
 */
export function getWhatsAppProvider(): MessagingChannelProvider {
  const mockDisabled = process.env.WHATSAPP_MOCK_MODE === 'false'
  if (!mockDisabled) {
    return new MockWhatsAppProvider()
  }
  throw new Error(
    'WHATSAPP_MOCK_MODE=false but no real WhatsApp provider is registered yet. Keep mock mode for local development.'
  )
}

export function getProviderForChannel(channel: MessagingChannel): MessagingChannelProvider {
  if (channel === MessagingChannel.WHATSAPP) {
    return getWhatsAppProvider()
  }
  throw new Error(`No messaging provider for channel ${channel}`)
}
