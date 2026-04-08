import {
  AuditAction,
  PayoutBatchStatus,
  PayoutItemStatus,
  SubmissionStatus
} from '@prisma/client'
import { prisma } from '../client'
import type { InitiatePayoutBatchResult } from '../payments/types'
import { getPaymentProvider } from '../payments/provider'
import { createAuditEvent } from './auditService'
import { notifyParticipantPayoutItemStatus } from './payoutNotificationHook'
import { idSchema, payoutBatchCreateSchema } from './schemas'

const blockingBatchStatuses: PayoutBatchStatus[] = [
  PayoutBatchStatus.DRAFT,
  PayoutBatchStatus.SUBMITTED,
  PayoutBatchStatus.PROCESSING,
  PayoutBatchStatus.COMPLETED
]

const eligibleSubmissionInclude = {
  participantMilestone: {
    include: {
      milestoneTemplate: { select: { id: true, name: true } },
      participant: {
        select: {
          id: true,
          status: true,
          user: { select: { id: true, name: true, email: true } },
          cohort: {
            select: {
              id: true,
              name: true,
              programme: { select: { id: true, name: true, tenantId: true } }
            }
          }
        }
      }
    }
  }
} as const

export async function listPayoutEligibleSubmissions(
  tenantId: string,
  filters?: { programmeId?: string }
) {
  return prisma.evidenceSubmission.findMany({
    where: {
      status: SubmissionStatus.APPROVED,
      participantMilestone: {
        participant: {
          status: 'active',
          cohort: {
            programme: {
              tenantId,
              ...(filters?.programmeId ? { id: filters.programmeId } : {})
            }
          }
        }
      },
      NOT: {
        payoutItems: {
          some: {
            batch: {
              status: { in: blockingBatchStatuses }
            }
          }
        }
      }
    },
    orderBy: { id: 'asc' },
    include: eligibleSubmissionInclude
  })
}

async function assertSubmissionsEligibleForNewBatch(
  tenantId: string,
  evidenceSubmissionIds: string[]
) {
  const rows = await prisma.evidenceSubmission.findMany({
    where: {
      id: { in: evidenceSubmissionIds },
      status: SubmissionStatus.APPROVED,
      participantMilestone: {
        participant: {
          status: 'active',
          cohort: { programme: { tenantId } }
        }
      },
      NOT: {
        payoutItems: {
          some: {
            batch: {
              status: { in: blockingBatchStatuses }
            }
          }
        }
      }
    },
    select: { id: true }
  })
  if (rows.length !== evidenceSubmissionIds.length) {
    throw new Error('One or more submissions are not payout-ready or are already reserved in another batch.')
  }
}

export async function createPayoutBatch(
  input: unknown,
  context: {
    tenantId: string
    createdById?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const valid = payoutBatchCreateSchema.parse(input)
  const ids = valid.items.map((i) => i.evidenceSubmissionId)
  const uniqueIds = Array.from(new Set(ids))
  if (uniqueIds.length !== ids.length) {
    throw new Error('Duplicate evidence submissions in payout batch.')
  }

  await assertSubmissionsEligibleForNewBatch(context.tenantId, uniqueIds)

  const batch = await prisma.$transaction(async (tx) => {
    const b = await tx.payoutBatch.create({
      data: {
        tenantId: context.tenantId,
        name: valid.name?.trim() || null,
        status: PayoutBatchStatus.DRAFT,
        createdById: context.createdById ?? null
      }
    })
    for (const item of valid.items) {
      await tx.payoutItem.create({
        data: {
          batchId: b.id,
          evidenceSubmissionId: item.evidenceSubmissionId,
          amountMinor: item.amountMinor ?? null,
          currency: item.currency ?? 'USD',
          status: PayoutItemStatus.PENDING
        }
      })
    }
    return tx.payoutBatch.findFirstOrThrow({
      where: { id: b.id },
      include: {
        items: {
          orderBy: { id: 'asc' },
          include: {
            evidenceSubmission: {
              include: eligibleSubmissionInclude
            }
          }
        }
      }
    })
  })

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.createdById,
    action: AuditAction.CREATE,
    entityType: 'PayoutBatch',
    entityId: batch.id,
    details: { itemCount: batch.items.length, name: valid.name ?? null },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return batch
}

export async function listPayoutBatches(tenantId: string) {
  return prisma.payoutBatch.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { items: true } }
    }
  })
}

export async function getPayoutBatchDetail(batchId: string, tenantId: string) {
  const id = idSchema.parse(batchId)
  return prisma.payoutBatch.findFirst({
    where: { id, tenantId },
    include: {
      items: {
        orderBy: { id: 'asc' },
        include: {
          evidenceSubmission: {
            include: eligibleSubmissionInclude
          }
        }
      }
    }
  })
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function buildPayoutBatchCsv(batchId: string, tenantId: string): Promise<string> {
  const batch = await getPayoutBatchDetail(batchId, tenantId)
  if (!batch) {
    throw new Error('Payout batch not found.')
  }

  const headers = [
    'payout_item_id',
    'payout_batch_id',
    'batch_name',
    'batch_status',
    'item_status',
    'evidence_submission_id',
    'submission_title',
    'milestone_name',
    'participant_id',
    'participant_email',
    'participant_name',
    'cohort_name',
    'programme_name',
    'amount_minor',
    'currency',
    'provider_batch_ref',
    'provider_item_ref'
  ]

  const lines = batch.items.map((item) => {
    const es = item.evidenceSubmission
    const pm = es.participantMilestone
    const p = pm.participant
    const cells = [
      item.id,
      batch.id,
      batch.name ?? '',
      batch.status,
      item.status,
      es.id,
      es.title,
      pm.milestoneTemplate.name,
      p.id,
      p.user.email,
      p.user.name ?? '',
      p.cohort.name,
      p.cohort.programme.name,
      item.amountMinor != null ? String(item.amountMinor) : '',
      item.currency,
      batch.providerBatchRef ?? '',
      item.providerItemRef ?? ''
    ]
    return cells.map((c) => escapeCsvCell(c)).join(',')
  })

  return [headers.join(','), ...lines].join('\r\n') + '\r\n'
}

export async function cancelPayoutBatch(
  batchId: string,
  context: {
    tenantId: string
    actingUserId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(batchId)
  const updated = await prisma.payoutBatch.updateMany({
    where: { id, tenantId: context.tenantId, status: PayoutBatchStatus.DRAFT },
    data: { status: PayoutBatchStatus.CANCELLED }
  })
  if (updated.count !== 1) {
    throw new Error('Only draft payout batches can be cancelled.')
  }

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.actingUserId,
    action: AuditAction.UPDATE,
    entityType: 'PayoutBatch',
    entityId: id,
    details: { status: PayoutBatchStatus.CANCELLED },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })
}

export async function submitPayoutBatchToProvider(
  batchId: string,
  context: {
    tenantId: string
    actingUserId?: string
    ipAddress?: string
    userAgent?: string
  }
) {
  const id = idSchema.parse(batchId)

  const batch = await prisma.payoutBatch.findFirst({
    where: { id, tenantId: context.tenantId },
    include: { items: { orderBy: { id: 'asc' } } }
  })
  if (!batch) {
    throw new Error('Payout batch not found.')
  }
  if (batch.status !== PayoutBatchStatus.DRAFT) {
    throw new Error('Only draft payout batches can be submitted to the payment provider.')
  }
  if (batch.items.length === 0) {
    throw new Error('Add at least one payout item before submitting.')
  }

  await prisma.$transaction([
    prisma.payoutBatch.update({
      where: { id },
      data: { status: PayoutBatchStatus.PROCESSING, failureReason: null }
    }),
    prisma.payoutItem.updateMany({
      where: { batchId: id },
      data: { status: PayoutItemStatus.PROCESSING, failureReason: null }
    })
  ])

  const provider = getPaymentProvider()
  let result: InitiatePayoutBatchResult

  try {
    result = await provider.initiatePayoutBatch({
      tenantId: context.tenantId,
      batchId: id,
      lines: batch.items.map((item) => ({
        externalItemKey: item.id,
        amountMinor: item.amountMinor ?? 0,
        currency: item.currency
      }))
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await prisma.$transaction([
      prisma.payoutBatch.update({
        where: { id },
        data: {
          status: PayoutBatchStatus.DRAFT,
          failureReason: `Provider error: ${message}`.slice(0, 2000)
        }
      }),
      prisma.payoutItem.updateMany({
        where: { batchId: id },
        data: { status: PayoutItemStatus.PENDING, failureReason: null }
      })
    ])
    throw new Error(`Payment provider failed: ${message}`)
  }

  const resultByKey = new Map(result.itemResults.map((r) => [r.externalItemKey, r]))
  let paid = 0
  let failed = 0

  await prisma.$transaction(async (tx) => {
    for (const item of batch.items) {
      const r = resultByKey.get(item.id)
      if (!r) {
        await tx.payoutItem.update({
          where: { id: item.id },
          data: {
            status: PayoutItemStatus.FAILED,
            failureReason: 'Missing provider result for line',
            providerItemRef: null
          }
        })
        failed += 1
        continue
      }
      if (r.outcome === 'paid') {
        await tx.payoutItem.update({
          where: { id: item.id },
          data: {
            status: PayoutItemStatus.PAID,
            providerItemRef: r.providerItemRef,
            failureReason: null
          }
        })
        paid += 1
      } else {
        await tx.payoutItem.update({
          where: { id: item.id },
          data: {
            status: PayoutItemStatus.FAILED,
            providerItemRef: r.providerItemRef,
            failureReason: r.failureReason ?? 'Provider reported failure'
          }
        })
        failed += 1
      }
    }

    await tx.payoutBatch.update({
      where: { id },
      data: {
        providerBatchRef: result.providerBatchRef,
        status: failed === 0 ? PayoutBatchStatus.COMPLETED : PayoutBatchStatus.FAILED,
        failureReason: failed > 0 ? `Some lines failed (${failed} of ${batch.items.length}).` : null
      }
    })
  })

  const detail = await getPayoutBatchDetail(id, context.tenantId)
  if (detail) {
    for (const item of detail.items) {
      if (item.status === PayoutItemStatus.PAID || item.status === PayoutItemStatus.FAILED) {
        const p = item.evidenceSubmission.participantMilestone.participant
        await notifyParticipantPayoutItemStatus({
          tenantId: context.tenantId,
          participantId: p.id,
          evidenceSubmissionTitle: item.evidenceSubmission.title,
          milestoneName: item.evidenceSubmission.participantMilestone.milestoneTemplate.name,
          batchLabel: detail.name,
          itemStatus: item.status
        })
      }
    }
  }

  await createAuditEvent({
    tenantId: context.tenantId,
    userId: context.actingUserId,
    action: AuditAction.UPDATE,
    entityType: 'PayoutBatch',
    entityId: id,
    details: {
      providerBatchRef: result.providerBatchRef,
      paid,
      failed,
      batchStatus: failed === 0 ? PayoutBatchStatus.COMPLETED : PayoutBatchStatus.FAILED
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  })

  return getPayoutBatchDetail(id, context.tenantId)
}
