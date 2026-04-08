import { MessagingChannel } from '@prisma/client'
import type { MessagingChannelProvider, SendChannelTextParams } from './types'

function normalizeGraphApiVersion(raw?: string): string {
  const trimmed = (raw ?? 'v21.0').trim()
  const noV = trimmed.replace(/^v/i, '')
  return noV ? `v${noV}` : 'v21.0'
}

type GraphSendResponse = {
  messages?: Array<{ id?: string }>
  error?: { message?: string; code?: number }
}

export type WhatsAppCloudProviderConfig = {
  phoneNumberId: string
  accessToken: string
  /** e.g. v21.0 */
  graphVersion?: string
}

/**
 * Outbound sends via WhatsApp Cloud API (Graph).
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */
export class WhatsAppCloudProvider implements MessagingChannelProvider {
  readonly name = 'whatsapp_cloud' as const
  readonly channel = MessagingChannel.WHATSAPP

  constructor(private readonly config: WhatsAppCloudProviderConfig) {}

  async sendText(params: SendChannelTextParams): Promise<{ providerMessageId: string }> {
    const to = params.toAddress.replace(/\D/g, '')
    if (!to) {
      throw new Error('Invalid WhatsApp recipient address (expected digits / E.164)')
    }
    const version = normalizeGraphApiVersion(this.config.graphVersion)
    const url = `https://graph.facebook.com/${version}/${this.config.phoneNumberId}/messages`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: params.text }
      }),
      signal: AbortSignal.timeout(45_000)
    })

    const json = (await res.json().catch(() => ({}))) as GraphSendResponse
    if (!res.ok) {
      const msg = json.error?.message ?? JSON.stringify(json)
      throw new Error(`WhatsApp Cloud API HTTP ${res.status}: ${msg}`)
    }
    const id = json.messages?.[0]?.id
    if (!id) {
      throw new Error(`WhatsApp Cloud API: missing messages[0].id in response`)
    }
    return { providerMessageId: id }
  }
}
