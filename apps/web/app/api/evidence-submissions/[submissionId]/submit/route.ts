import { submitEvidence } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'

type RouteContext = { params: { submissionId: string } }

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  try {
    const updated = await submitEvidence(context.params.submissionId, {
      tenantId: session.user.tenantId,
      participantUserId: session.user.id,
      actingUserId: session.user.id,
      ipAddress: _request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: _request.headers.get('user-agent') ?? undefined
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
