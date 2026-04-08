import { NextResponse } from 'next/server'
import { createCohort, getCohortList } from '@programmeos/prisma'
import { z } from 'zod'
import { requireCohortManager } from '@/lib/api-auth'

export async function GET() {
  const auth = await requireCohortManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const cohorts = await getCohortList(session.user.tenantId)
  return NextResponse.json(cohorts)
}

export async function POST(request: Request) {
  const auth = await requireCohortManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  try {
    const payload = await request.json()
    const cohort = await createCohort(payload, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('host') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(cohort)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
