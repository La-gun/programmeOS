import { createReadStream, existsSync } from 'fs'
import { stat } from 'fs/promises'
import { getDocumentById } from '@programmeos/prisma'
import { NextResponse } from 'next/server'
import { Readable } from 'stream'
import { requireSession } from '@/lib/api-auth'
import { canManageParticipants } from '@/lib/permissions'
import { absolutePathFromStorageKey } from '@/lib/uploads'

export const runtime = 'nodejs'

type RouteContext = { params: { documentId: string } }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSession()
  if (!auth.ok) {
    return auth.response
  }
  const { session } = auth

  const doc = await getDocumentById(context.params.documentId, session.user.tenantId)
  if (!doc || !doc.storagePath) {
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

  const abs = absolutePathFromStorageKey(doc.storagePath)
  if (!existsSync(abs)) {
    return NextResponse.json({ error: 'File missing on server.' }, { status: 404 })
  }

  const fileStat = await stat(abs)
  const stream = createReadStream(abs)

  const webStream = Readable.toWeb(stream) as ReadableStream

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'Content-Length': String(fileStat.size),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.name)}"`
    }
  })
}
