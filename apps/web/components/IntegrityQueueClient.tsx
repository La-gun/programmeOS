'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type FlagRow = {
  id: string
  ruleCode: string
  summary: string
  explanation: string
  metadata: unknown
}

type CaseRow = {
  id: string
  status: string
  createdAt: string
  resolvedAt: string | null
  resolutionNote: string | null
  primaryParticipant: {
    id: string
    user: { name: string | null; email: string }
  }
  triggerEvidenceSubmission: {
    id: string
    title: string
    submittedAt: string | null
    status: string
  } | null
  flags: FlagRow[]
  resolvedBy?: { name: string | null; email: string } | null
}

type RuleCatalog = {
  rules: Array<{ code: string; title: string; plainEnglish: string }>
  parameters: {
    submissionVelocity: { windowHours: number; flagWhenSubmissionCountAtLeast: number }
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

type Filter = 'OPEN' | 'ALL'

export default function IntegrityQueueClient() {
  const [filter, setFilter] = useState<Filter>('OPEN')
  const [cases, setCases] = useState<CaseRow[] | null>(null)
  const [catalog, setCatalog] = useState<RuleCatalog | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadCases = useCallback(async () => {
    setError('')
    const q = filter === 'OPEN' ? '?status=OPEN' : ''
    const cRes = await fetch(`/api/integrity-cases${q}`)
    if (!cRes.ok) {
      const body = await cRes.json().catch(() => ({}))
      setError(body?.error || 'Failed to load integrity cases.')
      return
    }
    setCases((await cRes.json()) as CaseRow[])
  }, [filter])

  useEffect(() => {
    void loadCases()
  }, [loadCases])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rRes = await fetch('/api/integrity-rules')
      if (cancelled || !rRes.ok) {
        return
      }
      setCatalog((await rRes.json()) as RuleCatalog)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const closeCase = async (caseId: string, status: 'RESOLVED' | 'DISMISSED') => {
    setBusyId(caseId)
    setError('')
    try {
      const res = await fetch(`/api/integrity-cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          resolutionNote: notes[caseId]?.trim() || undefined
        })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Update failed.')
      }
      setNotes((prev) => ({ ...prev, [caseId]: '' }))
      await loadCases()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusyId(null)
    }
  }

  if (!cases) {
    return <p className="text-sm text-gray-500">Loading integrity queue…</p>
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Show:</span>
        {(['OPEN', 'ALL'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === f ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'OPEN' ? 'Open cases' : 'All cases'}
          </button>
        ))}
      </div>

      {catalog ? (
        <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-indigo-950">How automated checks work</h2>
          <p className="mt-1 text-sm text-indigo-900/80">
            Every flag is produced by a fixed rule with explicit thresholds. Nothing here is a machine-learning
            guess — staff can read exactly what was evaluated.
          </p>
          <ul className="mt-4 space-y-4">
            {catalog.rules.map((r) => (
              <li key={r.code} className="rounded-lg border border-indigo-100/80 bg-white/80 p-4 text-sm">
                <p className="font-semibold text-gray-900">{r.title}</p>
                <p className="mt-1 text-gray-700">{r.plainEnglish}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-indigo-900/70">
            Velocity parameters: rolling window {catalog.parameters.submissionVelocity.windowHours} hours; flag
            when submitted count in that window is ≥{' '}
            {catalog.parameters.submissionVelocity.flagWhenSubmissionCountAtLeast}.
          </p>
        </section>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Case queue</h2>
        <p className="mt-1 text-sm text-gray-500">
          Each row is a case opened when someone submitted evidence and one or more rules matched. Openings and
          closures are written to the audit log.
        </p>
        {cases.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No cases in this view.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {cases.map((c) => {
              const open = expanded[c.id]
              const sub = c.triggerEvidenceSubmission
              return (
                <li key={c.id} className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            c.status === 'OPEN'
                              ? 'bg-amber-100 text-amber-900'
                              : c.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {c.status}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">Participant:</span>{' '}
                        {c.primaryParticipant.user.name || c.primaryParticipant.user.email}
                      </p>
                      {sub ? (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Submission:</span> {sub.title}{' '}
                          <Link
                            href={`/dashboard/evidence/${sub.id}`}
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            Open evidence
                          </Link>
                          {' · '}
                          <Link
                            href={`/dashboard/participants/${c.primaryParticipant.id}`}
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            Participant record
                          </Link>
                        </p>
                      ) : null}
                      <p className="text-sm text-gray-600">
                        Flags: {c.flags.map((f) => f.summary).join(' · ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                      <button
                        type="button"
                        onClick={() => toggle(c.id)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        {open ? 'Hide detail' : 'Why was this flagged?'}
                      </button>
                      {c.status === 'OPEN' ? (
                        <div className="flex flex-col gap-2 sm:items-end">
                          <textarea
                            rows={2}
                            placeholder="Optional note (stored on the case and in audit)"
                            className="w-full min-w-[200px] rounded-md border border-gray-300 px-2 py-1 text-sm sm:max-w-xs"
                            value={notes[c.id] ?? ''}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busyId === c.id}
                              onClick={() => void closeCase(c.id, 'RESOLVED')}
                              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              Mark resolved
                            </button>
                            <button
                              type="button"
                              disabled={busyId === c.id}
                              onClick={() => void closeCase(c.id, 'DISMISSED')}
                              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-right text-xs text-gray-500">
                          {c.resolvedAt ? <p>Closed {formatDate(c.resolvedAt)}</p> : null}
                          {c.resolvedBy ? (
                            <p>By {c.resolvedBy.name || c.resolvedBy.email}</p>
                          ) : null}
                          {c.resolutionNote ? (
                            <p className="mt-1 max-w-xs text-gray-600">{c.resolutionNote}</p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  {open ? (
                    <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4">
                      {c.flags.map((f) => (
                        <div key={f.id} className="text-sm">
                          <p className="font-semibold text-gray-900">
                            {f.ruleCode.replace(/_/g, ' ')}
                          </p>
                          <p className="mt-1 text-gray-800">{f.explanation}</p>
                          {f.metadata && typeof f.metadata === 'object' ? (
                            <pre className="mt-2 overflow-x-auto rounded border border-slate-200 bg-white p-2 text-xs text-gray-600">
                              {JSON.stringify(f.metadata, null, 2)}
                            </pre>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
