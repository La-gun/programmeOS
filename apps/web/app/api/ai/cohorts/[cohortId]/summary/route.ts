import { generateCohortSummary } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { assertCohortAiAccess } from '@/lib/ai-access'
import { requireSession } from '@/lib/api-auth'

type RouteContext = { params: { cohortId: string } }

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  const gate = await assertCohortAiAccess(session, context.params.cohortId)
  if ('error' in gate) {
    return gate.error
  }

  try {
    const result = await generateCohortSummary(context.params.cohortId, {
      tenantId: session.user.tenantId,
      actingUserId: session.user.id
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
