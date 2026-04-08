import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies Meta / Facebook webhook payloads using X-Hub-Signature-256.
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export function verifyMetaWebhookSignature256(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) {
    return false
  }
  const prefix = 'sha256='
  if (!signatureHeader.startsWith(prefix)) {
    return false
  }
  const receivedHex = signatureHeader.slice(prefix.length).trim().toLowerCase()
  if (!/^[0-9a-f]+$/.test(receivedHex) || receivedHex.length % 2 !== 0) {
    return false
  }
  const expectedHex = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  let receivedBuf: Buffer
  let expectedBuf: Buffer
  try {
    receivedBuf = Buffer.from(receivedHex, 'hex')
    expectedBuf = Buffer.from(expectedHex, 'hex')
  } catch {
    return false
  }
  if (receivedBuf.length !== expectedBuf.length) {
    return false
  }
  return timingSafeEqual(receivedBuf, expectedBuf)
}
