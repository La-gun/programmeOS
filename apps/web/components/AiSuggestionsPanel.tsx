'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type AiSuggestionsScope =
  | { mode: 'evidence'; submissionId: string }
  | { mode: 'review'; reviewId: string }
  | { mode: 'cohort'; cohortId: string }
  | { mode: 'participant'; participantId: string }

type SuggestionRow = {
  id: string
  kind: string
  text: string
  structured: unknown
  confidence: { score: number | null; label: string | null; rationale: string | null }
  provider: string
  model: string | null
  createdAt: string
  createdByUserId: string
}

type RunResult = {
  isAiSuggestion: true
  kind: string
  text: string
  structured: Record<string, unknown> | null
  confidence: { score: number | null; label: string | null; rationale: string | null }
  provider: string
  model: string | null
  persistedId: string
}

function listUrlForScope(scope: AiSuggestionsScope) {
  const base = '/api/ai/suggestions'
  if (scope.mode === 'evidence') {
    return `${base}?evidenceSubmissionId=${encodeURIComponent(scope.submissionId)}`
  }
  if (scope.mode === 'review') {
    return `${base}?evidenceReviewId=${encodeURIComponent(scope.reviewId)}`
  }
  if (scope.mode === 'cohort') {
    return `${base}?cohortId=${encodeURIComponent(scope.cohortId)}`
  }
  return `${base}?participantId=${encodeURIComponent(scope.participantId)}`
}

function formatConfidence(c: SuggestionRow['confidence']) {
  if (c.score == null && !c.label) {
    return null
  }
  const parts = []
  if (c.label) {
    parts.push(c.label)
  }
  if (c.score != null) {
    parts.push(`${Math.round(c.score * 100)}%`)
  }
  return parts.join(' · ')
}

export default function AiSuggestionsPanel({
  scope,
  className = ''
}: {
  scope: AiSuggestionsScope
  className?: string
}) {
  const [items, setItems] = useState<SuggestionRow[]>([])
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [latest, setLatest] = useState<RunResult | null>(null)
  const [inboundContext, setInboundContext] = useState('')
  const [intent, setIntent] = useState<'check_in' | 'nudge' | 'clarify' | 'celebrate' | 'neutral'>('neutral')

  const listUrl = useMemo(() => listUrlForScope(scope), [scope])

  const loadHistory = useCallback(async () => {
    setLoadError('')
    const res = await fetch(listUrl)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setLoadError(body?.error || 'Could not load suggestion history.')
      return
    }
    const pack = (await res.json()) as { items: SuggestionRow[] }
    setItems(pack.items ?? [])
  }, [listUrl])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const runPost = async (endpoint: string, body?: Record<string, unknown>) => {
    setBusy(true)
    setActionError('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Request failed.')
      }
      setLatest(data as RunResult)
      await loadHistory()
    } catch (e) {
      setActionError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const simpleAction =
    scope.mode === 'evidence'
      ? {
          label: 'Generate evidence summary (suggestion)',
          endpoint: `/api/ai/evidence/${scope.submissionId}/summarize`
        }
      : scope.mode === 'review'
        ? {
            label: 'Draft reviewer notes (suggestion)',
            endpoint: `/api/ai/reviews/${scope.reviewId}/draft-summary`
          }
        : scope.mode === 'cohort'
          ? {
              label: 'Generate cohort snapshot (suggestion)',
              endpoint: `/api/ai/cohorts/${scope.cohortId}/summary`
            }
          : null

  return (
    <section
      className={`rounded-xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm ${className}`}
      aria-label="AI assistant suggestions"
    >
      <div className="flex flex-col gap-2 border-b border-amber-200/80 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">AI suggestions</p>
        <p className="text-sm text-amber-950">
          Outputs here are <strong>suggestions only</strong>. They are not verified, do not change programme data, and
          do <strong>not</strong> make decisions for you. Always review before acting.
        </p>
      </div>

      {loadError && <p className="mt-3 text-sm text-red-700">{loadError}</p>}
      {actionError && <p className="mt-3 text-sm text-red-700">{actionError}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {scope.mode === 'participant' ? (
          <div className="space-y-2 rounded-lg border border-amber-200/60 bg-white/60 p-3">
            <label className="block text-xs font-medium text-amber-950">Optional thread / inbound context</label>
            <textarea
              value={inboundContext}
              onChange={(e) => setInboundContext(e.target.value)}
              rows={3}
              placeholder="Paste a short inbound message or notes (optional)."
              className="w-full rounded-md border-amber-200 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
            />
            <label className="block text-xs font-medium text-amber-950">Intent hint</label>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value as typeof intent)}
              className="rounded-md border-amber-200 text-sm shadow-sm focus:border-amber-500 focus:ring-amber-500"
            >
              <option value="neutral">Neutral</option>
              <option value="check_in">Check-in</option>
              <option value="nudge">Gentle nudge</option>
              <option value="clarify">Clarify</option>
              <option value="celebrate">Celebrate progress</option>
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void runPost(`/api/ai/participants/${scope.participantId}/suggest-reply`, {
                  ...(inboundContext.trim() ? { inboundContext: inboundContext.trim() } : {}),
                  intent
                })
              }
              className="rounded-md bg-amber-800 px-4 py-2 text-sm font-medium text-white hover:bg-amber-900 disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Suggest participant message draft'}
            </button>
          </div>
        ) : simpleAction ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void runPost(simpleAction.endpoint)}
            className="w-full rounded-md bg-amber-800 px-4 py-2 text-sm font-medium text-white hover:bg-amber-900 disabled:opacity-50 sm:w-auto"
          >
            {busy ? 'Working…' : simpleAction.label}
          </button>
        ) : null}
      </div>

      {latest && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-amber-900">Latest suggestion</p>
          {formatConfidence(latest.confidence) && (
            <p className="mt-2 text-xs text-amber-800">
              Confidence (metadata): {formatConfidence(latest.confidence)}
              {latest.confidence.rationale ? ` — ${latest.confidence.rationale}` : ''}
            </p>
          )}
          <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-900">{latest.text}</pre>
          <p className="mt-2 text-xs text-gray-500">
            Provider: {latest.provider}
            {latest.model ? ` / ${latest.model}` : ''}
          </p>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-amber-950">Saved suggestions (this screen)</h3>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-amber-900/80">No saved suggestions yet for this record.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {items.map((row) => (
              <li key={row.id} className="rounded-md border border-amber-100 bg-white/80 p-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-gray-900">{row.kind.replace(/_/g, ' ')}</span>
                  <time className="text-xs text-gray-500" dateTime={row.createdAt}>
                    {new Date(row.createdAt).toLocaleString()}
                  </time>
                </div>
                {formatConfidence(row.confidence) && (
                  <p className="mt-1 text-xs text-amber-800">
                    Confidence: {formatConfidence(row.confidence)}
                    {row.confidence.rationale ? ` — ${row.confidence.rationale}` : ''}
                  </p>
                )}
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-gray-800">{row.text}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
