import type { InitiatePayoutBatchRequest, InitiatePayoutBatchResult, PaymentProvider } from './types'

function mockRef(prefix: string, key: string) {
  return `${prefix}_mock_${key.slice(0, 8)}_${Date.now().toString(36)}`
}

/**
 * Deterministic no-op provider for development and tests.
 * Does not call the network or move funds.
 */
export function createMockPaymentProvider(): PaymentProvider {
  return {
    async initiatePayoutBatch(request: InitiatePayoutBatchRequest): Promise<InitiatePayoutBatchResult> {
      const providerBatchRef = mockRef('batch', request.batchId)
      const itemResults = request.lines.map((line) => ({
        externalItemKey: line.externalItemKey,
        providerItemRef: mockRef('item', line.externalItemKey),
        outcome: 'paid' as const
      }))
      return { providerBatchRef, itemResults }
    }
  }
}
