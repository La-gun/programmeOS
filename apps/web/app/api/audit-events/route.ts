import { listAuditEvents } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requireAuditViewer } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = await requireAuditViewer()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const url = new URL(request.url)
  const entityType = url.searchParams.get('entityType') ?? undefined
  const entityId = url.searchParams.get('entityId') ?? undefined
  const limitRaw = url.searchParams.get('limit')
  const limit = limitRaw ? Number(limitRaw) : undefined

  const events = await listAuditEvents(session.user.tenantId, {
    entityType: entityType ?? undefined,
    entityId: entityId ?? undefined,
    limit: Number.isFinite(limit) ? limit : undefined
  })

  return NextResponse.json(events)
}
