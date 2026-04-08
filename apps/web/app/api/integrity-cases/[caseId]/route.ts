import { closeIntegrityCase, getIntegrityCaseById } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireIntegrityQueueAccess } from '@/lib/api-auth'

type RouteContext = { params: Promise<{ caseId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireIntegrityQueueAccess()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth
  const { caseId } = await context.params

  const row = await getIntegrityCaseById(caseId, session.user.tenantId)
  if (!row) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }
  return NextResponse.json(row)
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireIntegrityQueueAccess()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth
  const { caseId } = await context.params

  try {
    const body = await request.json()
    const updated = await closeIntegrityCase(caseId, body, {
      tenantId: session.user.tenantId,
      actingUserId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    const message = String(error)
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
