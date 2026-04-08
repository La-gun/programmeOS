import type { AiCompletion, AiTextProvider } from './types'

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

function mockConfidence(seed: number): AiCompletion['confidence'] {
  const score = clamp01(0.45 + (seed % 37) / 100)
  const label = score >= 0.72 ? 'high' : score >= 0.55 ? 'moderate' : 'low'
  return {
    score,
    label,
    rationale:
      'Mock provider: confidence is synthetic for development. Replace with a real model and calibrate scores separately.'
  }
}

export function createMockAiProvider(): AiTextProvider {
  return {
    id: 'mock',
    async complete({ system, user }) {
      const seed = (system.length + user.length) % 100
      const lines = user.split('\n').filter(Boolean)
      const headline = lines[0] ?? 'context'

      const text = [
        '**AI suggestion (not verified)**',
        '',
        `Context preview: ${headline.slice(0, 120)}${headline.length > 120 ? '…' : ''}`,
        '',
        'This is placeholder output from the mock AI provider. It does not read file contents.',
        'Wire `AI_PROVIDER=openai` with `OPENAI_API_KEY` for real completions.',
        '',
        '_No automated decisions are made from this text._'
      ].join('\n')

      return {
        text,
        structured: {
          providerNote: 'mock',
          inputLineCount: lines.length
        },
        confidence: mockConfidence(seed)
      }
    }
  }
}
