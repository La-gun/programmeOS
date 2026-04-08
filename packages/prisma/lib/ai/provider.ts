import type { AiTextProvider } from './types'
import { createMockAiProvider } from './mockAdapter'
import { createOpenAiTextProvider } from './openaiAdapter'

/**
 * Resolves the configured AI text provider. Defaults to mock when unset or unknown.
 */
export function getAiTextProvider(): AiTextProvider {
  const raw = (process.env.AI_PROVIDER ?? 'mock').trim().toLowerCase()
  if (raw === 'openai') {
    const key = process.env.OPENAI_API_KEY?.trim()
    if (!key) {
      throw new Error('AI_PROVIDER=openai requires OPENAI_API_KEY.')
    }
    return createOpenAiTextProvider({
      apiKey: key,
      model: process.env.OPENAI_MODEL
    })
  }
  if (raw === 'mock' || raw === '') {
    return createMockAiProvider()
  }
  throw new Error(
    `Unsupported AI_PROVIDER "${raw}". Use "mock" or "openai", or extend getAiTextProvider().`
  )
}

export { createMockAiProvider } from './mockAdapter'
export { createOpenAiTextProvider } from './openaiAdapter'
export type { AiCompletion, AiCompletionRequest, AiConfidence, AiTextProvider } from './types'
