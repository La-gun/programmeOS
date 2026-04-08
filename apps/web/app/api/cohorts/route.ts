import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCohort, getCohortList } from '@programmeos/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cohorts = await getCohortList(session.user.tenantId)
  return NextResponse.json(cohorts)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
