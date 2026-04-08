import { deleteDocument, getDocumentById } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-auth'
import { canManageParticipants } from '@/lib/permissions'
import { removeUploadedFile } from '@/lib/uploads'

export const runtime = 'nodejs'

type RouteContext = { params: { documentId: string } }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  const doc = await getDocumentById(context.params.documentId, session.user.tenantId)
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (doc.participantId && doc.participant) {
    const isSelf =
      session.user.role === 'PARTICIPANT' && session.user.id === doc.participant.userId
    if (!canManageParticipants(session.user.role) && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (!canManageParticipants(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(doc)
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  if (!canManageParticipants(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { storagePath } = await deleteDocument(context.params.documentId, session.user.tenantId, {
      userId: session.user.id,
      ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined
    })
    await removeUploadedFile(storagePath)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
