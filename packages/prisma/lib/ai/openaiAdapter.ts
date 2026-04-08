import type { AiTextProvider } from './types'

type OpenAiMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/**
 * Minimal Chat Completions client (fetch). Suggestions only; no tool use.
 */
export function createOpenAiTextProvider(options: {
  apiKey: string
  model?: string
}): AiTextProvider {
  const model = options.model?.trim() || 'gpt-4o-mini'

  return {
    id: 'openai',
    async complete({ system, user }) {
      const messages: OpenAiMessage[] = [
        {
          role: 'system',
          content: `${system}\n\nYou must output plain text only. Do not claim to have opened or read binary files. Clearly label uncertainty where context is incomplete.`
        },
        { role: 'user', content: user }
      ]

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages
        })
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`OpenAI request failed (${res.status}): ${errText.slice(0, 500)}`)
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const text = json.choices?.[0]?.message?.content?.trim() || ''

      return {
        text: text || '(empty model response)',
        confidence: {
          score: 0.55,
          label: 'moderate',
          rationale:
            'Heuristic placeholder confidence for external models; human review is always required.'
        }
      }
    }
  }
}
