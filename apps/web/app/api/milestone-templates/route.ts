import { NextResponse } from 'next/server'
import { createMilestoneTemplate } from '@programmeos/prisma'
import { z } from 'zod'
import { requireProgrammeManager } from '@/lib/api-auth'

export async function POST(request: Request) {
  const auth = await requireProgrammeManager()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  try {
    const payload = await request.json()
    const template = await createMilestoneTemplate(payload, {
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
