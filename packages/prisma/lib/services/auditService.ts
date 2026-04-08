import type { PrismaClient } from '@prisma/client'
import { AuditAction } from '@prisma/client'
import { prisma } from '../client'

type AuditDelegate = Pick<PrismaClient, 'auditEvent'>

export interface AuditEventContext {
  tenantId: string
  userId?: string
  action: AuditAction
  entityType: string
  entityId: string
  details?: unknown
  ipAddress?: string
  userAgent?: string
}

export async function createAuditEvent(context: AuditEventContext, db: AuditDelegate = prisma) {
  const { tenantId, userId, action, entityType, entityId, details, ipAddress, userAgent } = context
  return db.auditEvent.create({
    data: {
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null
    }
  })
}

export interface AuditListFilters {
  entityType?: string
  entityId?: string
  limit?: number
}

export async function listAuditEvents(tenantId: string, filters?: AuditListFilters) {
  const limit = Math.min(Math.max(filters?.limit ?? 100, 1), 500)
  return prisma.auditEvent.findMany({
    where: {
      tenantId,
      ...(filters?.entityType ? { entityType: filters.entityType } : {}),
      ...(filters?.entityId ? { entityId: filters.entityId } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  })
}
