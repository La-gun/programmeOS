'use client'

import type { MilestoneStatus, ReviewStatus, SubmissionStatus } from '@prisma/client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type MilestoneRow = {
  id: string
  status: MilestoneStatus
  dueDate: string | null
  notes: string | null
  milestoneTemplate: { id: string; name: string; description: string | null; order: number }
  evidenceSubmissions: Array<{
    id: string
    title: string
    status: SubmissionStatus
    submittedAt: string | null
    documents: string[]
    reviews: Array<{
      id: string
      status: ReviewStatus
      reviewer: { id: string; name: string | null; email: string }
    }>
  }>
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString()
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-amber-100 text-amber-900',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-900',
  APPROVED: 'bg-emerald-100 text-emerald-900',
  REJECTED: 'bg-red-100 text-red-900'
}

export default function ParticipantMilestonesClient({
  participantId,
  isManager,
  isParticipantSelf
}: {
  participantId: string
  isManager: boolean
  isParticipantSelf: boolean
}) {
  const [milestones, setMilestones] = useState<MilestoneRow[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [newTitle, setNewTitle] = useState<Record<string, string>>({})
  const [managerNote, setManagerNote] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setError('')
    const res = await fetch(`/api/participants/${participantId}/milestones`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body?.error || 'Failed to load milestones.')
      return
    }
    const data = (await res.json()) as MilestoneRow[]
    setMilestones(data)
  }, [participantId])

  useEffect(() => {
    void load()
  }, [load])

  const syncTemplates = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/participants/${participantId}/milestones`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Sync failed.')
      }
      const data = (await res.json()) as MilestoneRow[]
      setMilestones(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const createDraft = async (participantMilestoneId: string) => {
    const title = (newTitle[participantMilestoneId] ?? '').trim() || 'Evidence'
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/evidence-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantMilestoneId, title })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Could not create draft.')
      }
      setNewTitle((prev) => ({ ...prev, [participantMilestoneId]: '' }))
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const submitEvidence = async (submissionId: string) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/evidence-submissions/${submissionId}/submit`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Submit failed.')
      }
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const uploadToSubmission = async (submissionId: string, file: File) => {
    setBusy(true)
    setError('')
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('participantId', participantId)
      fd.set('evidenceSubmissionId', submissionId)
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Upload failed.')
      }
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const patchMilestone = async (milestoneId: string, payload: { status?: MilestoneStatus; notes?: string }) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/participant-milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Update failed.')
      }
      setManagerNote((prev) => ({ ...prev, [milestoneId]: '' }))
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  if (milestones === null) {
    return <p className="text-sm text-gray-500">Loading milestones…</p>
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Milestones & evidence</h3>
          <p className="mt-1 text-sm text-gray-500">
            Programme templates sync to each enrolment. Participants upload evidence; reviewers approve, reject, or request
            clarification.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void syncTemplates()}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? 'Working…' : 'Sync programme templates'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      )}

      {milestones.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No milestones yet. Add templates on the programme, then sync here.
        </p>
      ) : (
        <ul className="mt-6 space-y-6">
          {milestones.map((m) => (
            <li key={m.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {m.milestoneTemplate.order}. {m.milestoneTemplate.name}
                  </p>
                  {m.milestoneTemplate.description && (
                    <p className="text-sm text-gray-600">{m.milestoneTemplate.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Status: <span className="font-medium capitalize">{m.status.toLowerCase().replace(/_/g, ' ')}</span>
                    {' · '}
                    Due {formatDate(m.dueDate)}
                  </p>
                </div>
                {isManager && (
                  <div className="flex flex-col gap-2 sm:items-end">
                    <select
                      value={m.status}
                      disabled={busy}
                      onChange={(e) =>
                        void patchMilestone(m.id, { status: e.target.value as MilestoneStatus })
                      }
                      className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {(['NOT_STARTED', 'IN_PROGRESS', 'OVERDUE', 'COMPLETED'] as const).map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        value={managerNote[m.id] ?? m.notes ?? ''}
                        onChange={(e) => setManagerNote((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        placeholder="Staff notes"
                        className="w-48 rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void patchMilestone(m.id, { notes: managerNote[m.id] ?? '' })}
                        className="rounded-md bg-gray-800 px-2 py-1 text-xs font-medium text-white hover:bg-gray-900"
                      >
                        Save note
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Submissions</p>
                {m.evidenceSubmissions.length === 0 ? (
                  <p className="text-sm text-gray-500">No evidence yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {m.evidenceSubmissions.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-col gap-2 rounded-md border border-white bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{s.title}</p>
                          <p className="text-xs text-gray-500">
                            {s.documents.length} file(s)
                            {s.submittedAt ? ` · Submitted ${formatDate(s.submittedAt)}` : ''}
                          </p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[s.status] ?? 'bg-gray-100 text-gray-800'}`}
                          >
                            {s.status.replace(/_/g, ' ')}
                          </span>
                          {s.reviews.length > 0 && (
                            <ul className="mt-2 text-xs text-gray-600">
                              {s.reviews.map((r) => (
                                <li key={r.id}>
                                  {r.reviewer.name || r.reviewer.email}: {r.status.replace(/_/g, ' ')}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                          {isParticipantSelf && s.status === 'DRAFT' && (
                            <>
                              <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                                <input
                                  type="file"
                                  className="hidden"
                                  disabled={busy}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) {
                                      void uploadToSubmission(s.id, f)
                                    }
                                    e.target.value = ''
                                  }}
                                />
                                Attach file
                              </label>
                              <button
                                type="button"
                                disabled={busy || s.documents.length === 0}
                                onClick={() => void submitEvidence(s.id)}
                                className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                              >
                                Submit for review
                              </button>
                            </>
                          )}
                          {isManager && (
                            <Link
                              href={`/dashboard/evidence/${s.id}`}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                            >
                              Open evidence detail
                            </Link>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {isParticipantSelf && (
                <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:items-center">
                  <input
                    value={newTitle[m.id] ?? ''}
                    onChange={(e) => setNewTitle((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="Evidence title"
                    className="flex-1 rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void createDraft(m.id)}
                    className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    New evidence draft
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
