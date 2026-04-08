import type { PaymentProvider } from './types'
import { createMockPaymentProvider } from './mockAdapter'

/**
 * Resolves the configured payment provider. Only the mock adapter ships in-repo;
 * wire additional providers behind explicit env and code changes.
 */
export function getPaymentProvider(): PaymentProvider {
  const raw = (process.env.PAYMENT_PROVIDER ?? 'mock').trim().toLowerCase()
  if (raw === 'mock' || raw === '') {
    return createMockPaymentProvider()
  }
  throw new Error(
    `Unsupported PAYMENT_PROVIDER "${raw}". This build only bundles the mock adapter; add a provider module and whitelist it here before enabling.`
  )
}

export { createMockPaymentProvider } from './mockAdapter'
export type { InitiatePayoutBatchRequest, InitiatePayoutBatchResult, PaymentProvider } from './types'
