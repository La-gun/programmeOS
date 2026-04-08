/**
 * AI text providers produce suggestions only. Callers must never treat output as decisions.
 */
export type AiConfidence = {
  /** 0–1 where higher means the model self-assesses stronger grounding (heuristic for mock). */
  score: number
  label: string
  rationale?: string
}

export type AiCompletion = {
  text: string
  structured?: Record<string, unknown>
  confidence?: AiConfidence
}

export type AiCompletionRequest = {
  system: string
  user: string
}

export interface AiTextProvider {
  readonly id: string
  complete(input: AiCompletionRequest): Promise<AiCompletion>
}
