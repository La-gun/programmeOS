import { MessagingChannel } from '@prisma/client'
import type { MessagingChannelProvider, SendChannelTextParams } from './types'

export type MockWhatsAppSentMessage = SendChannelTextParams & {
  sentAt: string
  providerMessageId: string
}

/** In-process ring buffer for local debugging (last 200). */
export const mockWhatsAppOutbox: MockWhatsAppSentMessage[] = []

/**
 * Deterministic mock: no network. Logs to stdout and records outbox entries.
 */
export class MockWhatsAppProvider implements MessagingChannelProvider {
  readonly name = 'mock_whatsapp' as const
  readonly channel = MessagingChannel.WHATSAPP

  async sendText(params: SendChannelTextParams) {
    const providerMessageId = `mock_wamid.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`
    const entry: MockWhatsAppSentMessage = {
      ...params,
      sentAt: new Date().toISOString(),
      providerMessageId
    }
    mockWhatsAppOutbox.push(entry)
    if (mockWhatsAppOutbox.length > 200) {
      mockWhatsAppOutbox.splice(0, mockWhatsAppOutbox.length - 200)
    }
    if (process.env.NODE_ENV !== 'production') {
      console.info('[MockWhatsApp] sendText', { to: params.toAddress, preview: params.text.slice(0, 120) })
    }
    return { providerMessageId }
  }
}
