import { listMyReviewQueue } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { canReviewEvidence } from '@/lib/permissions'

export async function GET() {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  if (!canReviewEvidence(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const items = await listMyReviewQueue(session.user.id, session.user.tenantId)
  return NextResponse.json(items)
}
