import { submitPayoutBatchToProvider } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requirePayoutManager } from '@/lib/api-auth'

type RouteContext = { params: Promise<{ batchId: string }> }

export async function POST(request: Request, context: RouteContext) {
  const auth = await requirePayoutManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth
  const { batchId } = await context.params

  try {
    const batch = await submitPayoutBatchToProvider(batchId, {
      tenantId: session.user.tenantId,
      actingUserId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(batch)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
