/**
 * Payment integration boundary: providers receive opaque keys and amounts only.
 * No card numbers, bank tokens, or national IDs cross this interface.
 */
export type PaymentItemOutcome = 'paid' | 'failed'

export type InitiatePayoutBatchRequest = {
  tenantId: string
  batchId: string
  /** Stable per-line key (e.g. payout item id); must not embed PII */
  lines: Array<{
    externalItemKey: string
    amountMinor: number
    currency: string
  }>
}

export type InitiatePayoutBatchResult = {
  providerBatchRef: string
  itemResults: Array<{
    externalItemKey: string
    providerItemRef: string
    outcome: PaymentItemOutcome
    failureReason?: string
  }>
}

export interface PaymentProvider {
  initiatePayoutBatch(request: InitiatePayoutBatchRequest): Promise<InitiatePayoutBatchResult>
}
