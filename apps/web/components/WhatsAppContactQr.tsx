'use client'

import { EncodedUrlQr } from '@/components/EncodedUrlQr'

type Props = {
  chatUrl: string
  /** QR image width/height in CSS pixels (default 220). Use ~280–360 for “scan from desk” testing. */
  size?: number
  title?: string
  description?: string
  className?: string
}

/**
 * Scannable QR for a wa.me / Click-to-Chat URL (opens WhatsApp on the device).
 */
export function WhatsAppContactQr({
  chatUrl,
  size = 220,
  title = 'WhatsApp contact QR',
  description = 'Participants scan this with their phone camera (or any QR reader). It opens WhatsApp to your business number. Messages still flow through your Meta webhook into ProgrammeOS like any other inbound chat.',
  className = ''
}: Props) {
  return (
    <EncodedUrlQr
      url={chatUrl}
      size={size}
      title={title}
      description={description}
      className={className}
      variant="emerald"
      imgAlt="QR code to open WhatsApp chat"
    />
  )
}
