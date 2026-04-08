import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteMilestoneTemplate, getMilestoneTemplateById, updateMilestoneTemplate } from '@programmeos/prisma'
import { z } from 'zod'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
