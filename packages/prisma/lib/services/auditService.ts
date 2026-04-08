import { AuditAction } from '@prisma/client'
import { prisma } from '@programmeos/prisma'

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

export async function createAuditEvent(context: AuditEventContext) {
  const { tenantId, userId, action, entityType, entityId, details, ipAddress, userAgent } = context
  return prisma.auditEvent.create({
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
