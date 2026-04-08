/**
 * WhatsApp Click to Chat — encode in a QR code so scanning opens WhatsApp to your business line.
 * @see https://faq.whatsapp.com/general/chats/how-to-use-click-to-chat
 */
export function normaliseWhatsAppMsisdn(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function buildWhatsAppClickToChatUrl(msisdnDigits: string, prefilledText?: string): string {
  const digits = normaliseWhatsAppMsisdn(msisdnDigits)
  if (!digits) {
    throw new Error('WhatsApp number must contain digits (E.164 without +)')
  }
  const base = `https://wa.me/${digits}`
  const text = prefilledText?.trim()
  if (!text) {
    return base
  }
  return `${base}?text=${encodeURIComponent(text)}`
}
