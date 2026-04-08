import { IntegrityCaseStatus } from '@prisma/client'
import { listIntegrityCases } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requireIntegrityQueueAccess } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = await requireIntegrityQueueAccess()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status')
  const status =
    statusParam === 'OPEN' || statusParam === 'RESOLVED' || statusParam === 'DISMISSED'
      ? (statusParam as IntegrityCaseStatus)
      : undefined

  const cases = await listIntegrityCases(session.user.tenantId, status ? { status } : undefined)
  return NextResponse.json(cases)
}
