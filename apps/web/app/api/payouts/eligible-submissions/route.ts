import { listPayoutEligibleSubmissions } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requirePayoutManager } from '@/lib/api-auth'

export async function GET(request: Request) {
  const auth = await requirePayoutManager()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  const { searchParams } = new URL(request.url)
  const programmeId = searchParams.get('programmeId')?.trim() || undefined

  const submissions = await listPayoutEligibleSubmissions(session.user.tenantId, {
    programmeId
  })
  return NextResponse.json({ submissions })
}
