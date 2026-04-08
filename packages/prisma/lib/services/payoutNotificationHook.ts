import type { PayoutItemStatus } from '@prisma/client'
import { postInternalSystemNotice } from './messagingService'

export type PayoutNotificationPayload = {
  tenantId: string
  participantId: string
  evidenceSubmissionTitle: string
  milestoneName: string
  batchLabel: string | null
  itemStatus: PayoutItemStatus
}

function buildMessage(payload: PayoutNotificationPayload): string {
  const batch = payload.batchLabel?.trim() || 'Payout batch'
  if (payload.itemStatus === 'PAID') {
    return `${batch}: your stipend for "${payload.milestoneName}" (${payload.evidenceSubmissionTitle}) is marked as paid. If you have questions, contact your programme team.`
  }
  if (payload.itemStatus === 'FAILED') {
    return `${batch}: we could not complete payment for "${payload.milestoneName}" (${payload.evidenceSubmissionTitle}). Please contact your programme team.`
  }
  return `${batch}: payout status for "${payload.milestoneName}" is now ${payload.itemStatus}.`
}

/**
 * Hook invoked after payout item terminal states are persisted.
 * Safe default: internal system message only (no WhatsApp, no PII to third parties).
 */
export async function notifyParticipantPayoutItemStatus(payload: PayoutNotificationPayload): Promise<void> {
  if (payload.itemStatus !== 'PAID' && payload.itemStatus !== 'FAILED') {
    return
  }
  try {
    await postInternalSystemNotice({
      tenantId: payload.tenantId,
      participantId: payload.participantId,
      content: buildMessage(payload)
    })
  } catch {
    // Never fail payout persistence because messaging failed
  }
}
