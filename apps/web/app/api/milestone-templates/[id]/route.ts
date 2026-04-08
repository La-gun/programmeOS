import { NextResponse } from 'next/server'
import { deleteMilestoneTemplate, getMilestoneTemplateById, updateMilestoneTemplate } from '@programmeos/prisma'
import { z } from 'zod'
import { requireProgrammeManager } from '@/lib/api-auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireProgrammeManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const template = await getMilestoneTemplateById(params.id, session.user.tenantId)
  if (!template) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(template)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireProgrammeManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  try {
    const payload = await request.json()
    const template = await updateMilestoneTemplate(params.id, payload, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('host') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(template)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireProgrammeManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  try {
    const template = await deleteMilestoneTemplate(params.id, {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('host') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(template)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
