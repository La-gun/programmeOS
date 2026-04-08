import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteCohort, getCohortById, updateCohort } from '@programmeos/prisma'
import { z } from 'zod'

export async function GET(
  request: Request,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cohort = await getCohortById(params.cohortId, session.user.tenantId)
  if (!cohort) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(cohort)
}

export async function PATCH(
  request: Request,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const cohort = await updateCohort(params.cohortId, payload, {
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

export async function DELETE(
  request: Request,
  { params }: { params: { cohortId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cohort = await deleteCohort(params.cohortId, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('host') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(cohort)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
