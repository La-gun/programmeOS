import { buildPayoutBatchCsv } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requirePayoutManager } from '@/lib/api-auth'

type RouteContext = { params: Promise<{ batchId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePayoutManager()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth
  const { batchId } = await context.params

  try {
    const csv = await buildPayoutBatchCsv(batchId, session.user.tenantId)
    const filename = `payout-batch-${batchId}.csv`
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
