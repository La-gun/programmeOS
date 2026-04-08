import { createPayoutBatch, listPayoutBatches } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePayoutManager } from '@/lib/api-auth'

export async function GET() {
  const auth = await requirePayoutManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const batches = await listPayoutBatches(session.user.tenantId)
  return NextResponse.json({ batches })
}

export async function POST(request: Request) {
  const auth = await requirePayoutManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  try {
    const payload = await request.json()
    const batch = await createPayoutBatch(payload, {
      tenantId: session.user.tenantId,
      createdById: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(batch)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 })
  }
}
