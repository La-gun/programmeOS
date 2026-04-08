import { MessagingChannel } from '@prisma/client'
import { processInboundChannelMessage } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { claimInboundMessageOnce } from '@/lib/messaging/idempotency'
import { parseWhatsAppCloudInboundMessages } from '@/lib/messaging/parse-whatsapp-cloud'
import { resolveInboundTenantId } from '@/lib/messaging/tenant-resolve'
import { verifyMetaWebhookSignature256 } from '@/lib/messaging/verify-meta-webhook-signature'

export const dynamic = 'force-dynamic'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Meta sends X-Hub-Signature-256 (HMAC-SHA256 of raw body). Optional dev-only mock bypass.
 * Without META_APP_SECRET, Bearer auth can be used for manual testing (not for real Meta traffic).
 */
function assertInboundAuthorized(
  request: Request,
  rawBody: string,
  parsedBody: unknown
): NextResponse | null {
  const isDevMock =
    process.env.NODE_ENV !== 'production' && isRecord(parsedBody) && parsedBody.mock === true

  if (isDevMock) {
    const bearerSecret = process.env.MESSAGING_INBOUND_SECRET?.trim()
    if (bearerSecret && request.headers.get('authorization') !== `Bearer ${bearerSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null
  }

  const appSecret = process.env.META_APP_SECRET?.trim()
  if (appSecret) {
    const sig = request.headers.get('x-hub-signature-256')
    if (verifyMetaWebhookSignature256(rawBody, sig, appSecret)) {
      return null
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bearerSecret = process.env.MESSAGING_INBOUND_SECRET?.trim()
  if (bearerSecret) {
    if (request.headers.get('authorization') !== `Bearer ${bearerSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null
  }

  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        error:
          'Server misconfiguration: set META_APP_SECRET for Meta webhooks (or MESSAGING_INBOUND_SECRET for non-Meta testing only)'
      },
      { status: 500 }
    )
  }

  return null
}

type DevMockBody = {
  mock?: boolean
  messageId?: string
  from?: string
  text?: string
  tenantId?: string
}

function normaliseFromAddress(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits ? `+${digits}` : raw.trim()
}

/**
 * Meta WhatsApp webhook verification handshake.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  if (mode === 'subscribe' && token && challenge) {
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()
    if (expected && token === expected) {
      return new NextResponse(challenge, { status: 200 })
    }
    return new NextResponse('Forbidden', { status: 403 })
  }
  return NextResponse.json({
    ok: true,
    hint: 'Meta sends hub.mode=subscribe&hub.verify_token&hub.challenge for webhook setup.'
  })
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  let body: unknown
  try {
    body = rawBody ? JSON.parse(rawBody) : null
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const authErr = assertInboundAuthorized(request, rawBody, body)
  if (authErr) {
    return authErr
  }

  const tenantHeader = request.headers.get('x-tenant-id')
  const tenantId = await resolveInboundTenantId(tenantHeader)
  if (!tenantId) {
    return NextResponse.json(
      { error: 'Could not resolve tenant (set MESSAGING_DEFAULT_TENANT_ID or X-Tenant-Id header)' },
      { status: 400 }
    )
  }

  const dev = body as DevMockBody
  if (dev && dev.mock === true) {
    const messageId = typeof dev.messageId === 'string' ? dev.messageId : ''
    const from = typeof dev.from === 'string' ? dev.from : ''
    const text = typeof dev.text === 'string' ? dev.text : ''
    const explicitTenant = typeof dev.tenantId === 'string' ? dev.tenantId.trim() : ''
    const effectiveTenant = explicitTenant || tenantId
    if (!messageId || !from || !text) {
      return NextResponse.json(
        { error: 'mock payload requires messageId, from, text (optional tenantId)' },
        { status: 400 }
      )
    }
    const claimed = await claimInboundMessageOnce('mock_whatsapp', messageId)
    if (!claimed) {
      return NextResponse.json({ ok: true, duplicate: true, provider: 'mock_whatsapp' })
    }
    const result = await processInboundChannelMessage({
      tenantId: effectiveTenant,
      channel: MessagingChannel.WHATSAPP,
      fromAddress: normaliseFromAddress(from),
      providerMessageId: messageId,
      text
    })
    return NextResponse.json({ ok: true, result })
  }

  const normalised = parseWhatsAppCloudInboundMessages(body)
  if (normalised.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, note: 'No text messages in payload' })
  }

  const results: unknown[] = []
  for (const msg of normalised) {
    const claimed = await claimInboundMessageOnce('whatsapp_cloud', msg.providerMessageId)
    if (!claimed) {
      results.push({ providerMessageId: msg.providerMessageId, duplicate: true })
      continue
    }
    const result = await processInboundChannelMessage({
      tenantId,
      channel: MessagingChannel.WHATSAPP,
      fromAddress: msg.fromAddress,
      providerMessageId: msg.providerMessageId,
      text: msg.text,
      externalThreadId: msg.externalThreadId
    })
    results.push({ providerMessageId: msg.providerMessageId, result })
  }

  return NextResponse.json({ ok: true, processed: results.length, results })
}
