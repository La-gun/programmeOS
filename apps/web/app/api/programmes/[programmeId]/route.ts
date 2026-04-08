import { NextResponse } from 'next/server'
import { deleteProgramme, getProgrammeById, updateProgramme } from '@programmeos/prisma'
import { z } from 'zod'
import { requireProgrammeManager } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: { programmeId: string } }
) {
  const auth = await requireProgrammeManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const programme = await getProgrammeById(params.programmeId, session.user.tenantId)
  if (!programme) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(programme)
}

export async function PATCH(
  request: Request,
  { params }: { params: { programmeId: string } }
) {
  const auth = await requireProgrammeManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  try {
    const payload = await request.json()
    const programme = await updateProgramme(params.programmeId, payload, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('host') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(programme)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { programmeId: string } }
) {
  const auth = await requireProgrammeManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  try {
    const programme = await deleteProgramme(params.programmeId, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('host') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(programme)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
