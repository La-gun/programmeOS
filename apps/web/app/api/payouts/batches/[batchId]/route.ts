import { getPayoutBatchDetail } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requirePayoutManager } from '@/lib/api-auth'

type RouteContext = { params: Promise<{ batchId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePayoutManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth
  const { batchId } = await context.params

  const batch = await getPayoutBatchDetail(batchId, session.user.tenantId)
  if (!batch) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(batch)
}
