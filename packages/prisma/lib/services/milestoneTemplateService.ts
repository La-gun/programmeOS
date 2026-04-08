import { AuditAction } from '@prisma/client'
import { prisma } from '@programmeos/prisma'
import { createAuditEvent } from './auditService'
import { idSchema, milestoneTemplateCreateSchema, milestoneTemplateUpdateSchema } from './schemas'

export async function getMilestoneTemplateById(templateId: string, tenantId: string) {
  const id = idSchema.parse(templateId)
  return prisma.milestoneTemplate.findFirst({
    where: { id, programme: { tenantId } },
    include: {
      programme: true
    }
  })
}

export async function createMilestoneTemplate(
  input: unknown,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const valid = milestoneTemplateCreateSchema.parse(input)

  const programme = await prisma.programme.findFirst({
    where: { id: valid.programmeId, tenantId: context.tenantId }
  })

  if (!programme) {
    throw new Error('Programme not found.')
  }

  const template = await prisma.milestoneTemplate.create({
    data: {
      ...valid
    }
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.CREATE,
    entityType: 'MilestoneTemplate',
    entityId: template.id,
    details: valid,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return template
}

export async function updateMilestoneTemplate(
  templateId: string,
  input: unknown,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(templateId)
  const valid = milestoneTemplateUpdateSchema.parse(input)

  if (Object.keys(valid).length === 0) {
    throw new Error('No update payload provided.')
  }

  const existing = await prisma.milestoneTemplate.findFirst({
    where: { id, programme: { tenantId: context.tenantId } }
  })
  if (!existing) {
    throw new Error('Milestone template not found.')
  }

  const template = await prisma.milestoneTemplate.update({
    where: { id },
    data: {
      ...valid
    }
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.UPDATE,
    entityType: 'MilestoneTemplate',
    entityId: template.id,
    details: valid,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return template
}

export async function deleteMilestoneTemplate(
  templateId: string,
  context: {
    tenantId: string
    userId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(templateId)
  const existing = await prisma.milestoneTemplate.findFirst({
    where: { id, programme: { tenantId: context.tenantId } }
  })
  if (!existing) {
    throw new Error('Milestone template not found.')
  }

  const template = await prisma.milestoneTemplate.delete({ where: { id } })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.userId,
    action: AuditAction.DELETE,
    entityType: 'MilestoneTemplate',
    entityId: template.id,
    details: existing,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return template
}
