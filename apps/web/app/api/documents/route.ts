import { getParticipantById, listDocumentsForTenant } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { canManageParticipants } from '@/lib/permissions'

export async function GET(request: Request) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  const url = new URL(request.url)
  const participantId = url.searchParams.get('participantId') ?? undefined

  if (participantId) {
    const p = await getParticipantById(participantId, session.user.tenantId)
    if (!p) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const isSelf = session.user.role === 'PARTICIPANT' && session.user.id === p.userId
    if (!canManageParticipants(session.user.role) && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (!canManageParticipants(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const documents = await listDocumentsForTenant(session.user.tenantId, { participantId })
  return NextResponse.json(documents)
}
