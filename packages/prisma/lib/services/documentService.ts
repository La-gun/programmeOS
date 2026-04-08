import { AuditAction } from '@prisma/client'
import { prisma } from '../client'
import { createAuditEvent } from './auditService'
import { idSchema } from './schemas'

export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export async function getDocumentById(documentId: string, tenantId: string) {
  const id = idSchema.parse(documentId)
  return prisma.document.findFirst({
    where: { id, tenantId },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      participant: {
        select: {
          id: true,
          userId: true,
          cohort: {
            select: { id: true, name: true, programme: { select: { id: true, name: true } } }
          }
        }
      }
    }
  })
}

export async function listDocumentsForParticipantUser(tenantId: string, userId: string) {
  return prisma.document.findMany({
    where: {
      tenantId,
      participant: { userId }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      participant: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } }
        }
      }
    }
  })
}

export async function listDocumentsByIds(documentIds: string[], tenantId: string) {
  const ids = [...new Set(documentIds.map((id) => idSchema.parse(id)))]
  if (ids.length === 0) {
    return []
  }
  return prisma.document.findMany({
    where: { id: { in: ids }, tenantId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, url: true, createdAt: true, mimeType: true, size: true }
  })
}

export async function listDocumentsForTenant(
  tenantId: string,
  filters?: { participantId?: string }
) {
  const participantId = filters?.participantId ? idSchema.parse(filters.participantId) : undefined

  return prisma.document.findMany({
    where: {
      tenantId,
      ...(participantId !== undefined ? { participantId } : {})
    },
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      participant: {
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } }
        }
      }
    }
  })
}

export interface CreateStoredDocumentInput {
  tenantId: string
  uploadedById?: string
  participantId?: string
  name: string
  mimeType?: string | null
  size: number
  storagePath: string
}

export async function createStoredDocumentRecord(
  data: CreateStoredDocumentInput,
  audit: {
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  if (data.participantId) {
    const p = await prisma.participant.findFirst({
      where: { id: data.participantId, cohort: { programme: { tenantId: data.tenantId } } }
    })
    if (!p) {
      throw new Error('Participant not found.')
    }
  }

  const withUrl = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.create({
      data: {
        name: data.name,
        url: 'pending',
        storagePath: data.storagePath,
        mimeType: data.mimeType ?? null,
        size: data.size,
        tenantId: data.tenantId,
        uploadedById: data.uploadedById ?? null,
        participantId: data.participantId ?? null
      }
    })
    return tx.document.update({
      where: { id: doc.id },
      data: { url: `/api/documents/${doc.id}/file` },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        participant: { select: { id: true, userId: true } }
      }
    })
  })

  await createAuditEvent({
    tenantId: data.tenantId,
    userId: audit.userId,
    action: AuditAction.CREATE,
    entityType: 'Document',
    entityId: withUrl.id,
    details: {
      name: data.name,
      participantId: data.participantId ?? null,
      size: data.size,
      mimeType: data.mimeType ?? null
    },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent
  })

  return withUrl
}

export async function deleteDocument(
  documentId: string,
  tenantId: string,
  audit: {
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(documentId)
  const existing = await prisma.document.findFirst({ where: { id, tenantId } })
  if (!existing) {
    throw new Error('Document not found.')
  }

  await prisma.document.delete({ where: { id } })

  await createAuditEvent({
    tenantId,
    userId: audit.userId,
    action: AuditAction.DELETE,
    entityType: 'Document',
    entityId: id,
    details: { name: existing.name, storagePath: existing.storagePath },
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent
  })

  return { id, storagePath: existing.storagePath }
}
