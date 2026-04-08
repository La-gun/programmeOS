import type { NormalisedInboundMessage } from './types'

type UnknownRecord = Record<string, unknown>

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Extracts text messages from a WhatsApp Cloud API webhook payload.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */
export function parseWhatsAppCloudInboundMessages(body: unknown): NormalisedInboundMessage[] {
  if (!isRecord(body)) {
    return []
  }
  const entries = body.entry
  if (!Array.isArray(entries)) {
    return []
  }

  const out: NormalisedInboundMessage[] = []

  for (const entry of entries) {
    if (!isRecord(entry)) continue
    const changes = entry.changes
    if (!Array.isArray(changes)) continue
    for (const change of changes) {
      if (!isRecord(change)) continue
      const value = change.value
      if (!isRecord(value)) continue
      const phoneNumberId =
        typeof value.metadata === 'object' && value.metadata !== null && 'phone_number_id' in value.metadata
          ? String((value.metadata as UnknownRecord).phone_number_id ?? '')
          : undefined
      const messages = value.messages
      if (!Array.isArray(messages)) continue
      for (const msg of messages) {
        if (!isRecord(msg)) continue
        if (msg.type !== 'text') continue
        const id = typeof msg.id === 'string' ? msg.id : ''
        const from = typeof msg.from === 'string' ? msg.from : ''
        const textBody =
          isRecord(msg.text) && typeof msg.text.body === 'string' ? msg.text.body : ''
        if (!id || !from || !textBody) continue
        const digits = from.replace(/\D/g, '')
        const fromAddress = digits ? `+${digits}` : from
        out.push({
          providerMessageId: id,
          fromAddress,
          text: textBody,
          externalThreadId: id,
          phoneNumberId: phoneNumberId || undefined
        })
      }
    }
  }

  return out
}
