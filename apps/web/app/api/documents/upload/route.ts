import {
  appendDocumentToSubmission,
  createStoredDocumentRecord,
  DEFAULT_MAX_UPLOAD_BYTES,
  getParticipantById,
  prisma
} from '@programmeos/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { requireSession } from '@/lib/api-auth'
import { canManageParticipants } from '@/lib/permissions'
import { buildRelativeStorageKey, writeUploadedFile } from '@/lib/uploads'

export async function POST(request: Request) {
  const auth = await requireSession()
  if (auth.ok === false) {
    return auth.response
  }
  const { session } = auth

  const form = await request.formData()
  const file = form.get('file')
  const participantIdRaw = form.get('participantId')
  const evidenceSubmissionIdRaw = form.get('evidenceSubmissionId')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Expected file field.' }, { status: 400 })
  }

  const participantId =
    typeof participantIdRaw === 'string' && participantIdRaw.trim() !== ''
      ? participantIdRaw.trim()
      : undefined

  const evidenceSubmissionId =
    typeof evidenceSubmissionIdRaw === 'string' && evidenceSubmissionIdRaw.trim() !== ''
      ? evidenceSubmissionIdRaw.trim()
      : undefined

  let participantOwnerUserId: string | undefined

  if (participantId) {
    const p = await getParticipantById(participantId, session.user.tenantId)
    if (!p) {
      return NextResponse.json({ error: 'Participant not found.' }, { status: 404 })
    }
    participantOwnerUserId = p.userId
    const isSelf = session.user.role === 'PARTICIPANT' && session.user.id === p.userId
    if (!canManageParticipants(session.user.role) && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (!canManageParticipants(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (evidenceSubmissionId && !participantId) {
    return NextResponse.json(
      { error: 'evidenceSubmissionId requires participantId for the same upload.' },
      { status: 400 }
    )
  }

  if (file.size > DEFAULT_MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${DEFAULT_MAX_UPLOAD_BYTES} bytes).` },
      { status: 413 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const storageKey = buildRelativeStorageKey(session.user.tenantId, file.name)

  let record
  try {
    record = await createStoredDocumentRecord(
      {
        tenantId: session.user.tenantId,
        uploadedById: session.user.id,
        participantId,
        name: file.name,
        mimeType: file.type || null,
        size: file.size,
        storagePath: storageKey
      },
      {
        userId: session.user.id,
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined
      }
    )
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }

  try {
    await writeUploadedFile(storageKey, buffer)
  } catch (e) {
    await prisma.document.delete({ where: { id: record.id } }).catch(() => undefined)
    return NextResponse.json({ error: `Failed to store file: ${String(e)}` }, { status: 500 })
  }

  if (evidenceSubmissionId && participantId && participantOwnerUserId) {
    try {
      await appendDocumentToSubmission(evidenceSubmissionId, record.id, {
        tenantId: session.user.tenantId,
        participantUserId: participantOwnerUserId,
        actingUserId: session.user.id,
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined
      })
    } catch (e) {
      return NextResponse.json(
        { error: String(e), document: record },
        { status: 400 }
      )
    }
  }

  return NextResponse.json(record)
}
