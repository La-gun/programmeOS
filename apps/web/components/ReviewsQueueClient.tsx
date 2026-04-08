'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type QueueItem = {
  id: string
  status: string
  evidenceSubmission: {
    id: string
    title: string
    status: string
    submittedAt: string | null
    participantMilestone: {
      milestoneTemplate: { name: string }
      participant: {
        id: string
        user: { name: string | null; email: string }
      }
    }
  }
}

type ReviewerOption = { id: string; name: string | null; email: string }

type PendingRow = {
  id: string
  title: string
  status: string
  submittedAt: string | null
  participantMilestone: {
    milestoneTemplate: { name: string }
    participant: {
      id: string
      user: { name: string | null; email: string }
    }
  }
  reviews: Array<{ id: string; reviewerId: string; status: string }>
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export default function ReviewsQueueClient() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [pending, setPending] = useState<PendingRow[]>([])
  const [reviewers, setReviewers] = useState<ReviewerOption[]>([])
  const [assignFor, setAssignFor] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setError('')
    const [qRes, pRes] = await Promise.all([
      fetch('/api/evidence-reviews/queue'),
      fetch('/api/evidence-submissions/pending-assignment')
    ])
    if (!qRes.ok) {
      const body = await qRes.json().catch(() => ({}))
      setError(body?.error || 'Failed to load queue.')
      return
    }
    const qData = (await qRes.json()) as QueueItem[]
    setQueue(qData)
    if (pRes.ok) {
      const pData = (await pRes.json()) as { submissions: PendingRow[]; reviewers: ReviewerOption[] }
      setPending(pData.submissions)
      setReviewers(pData.reviewers)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const assign = async (submissionId: string) => {
    const reviewerId = assignFor[submissionId]
    if (!reviewerId) {
      setError('Choose a reviewer.')
      return
    }
    setBusyId(submissionId)
    setError('')
    try {
      const res = await fetch(`/api/evidence-submissions/${submissionId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Assignment failed.')
      }
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">My review assignments</h2>
        <p className="mt-1 text-sm text-gray-500">Open a row to approve, reject, or request clarification.</p>
        {queue.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No pending reviews assigned to you.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {queue.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{row.evidenceSubmission.title}</p>
                  <p className="text-sm text-gray-600">
                    {row.evidenceSubmission.participantMilestone.milestoneTemplate.name} ·{' '}
                    {row.evidenceSubmission.participantMilestone.participant.user.name ||
                      row.evidenceSubmission.participantMilestone.participant.user.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    Submitted {formatDate(row.evidenceSubmission.submittedAt)}
                  </p>
                </div>
                <Link
                  href={`/dashboard/reviews/${row.id}`}
                  className="inline-flex rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Awaiting reviewer assignment</h2>
        <p className="mt-1 text-sm text-gray-500">
          Submitted evidence moves to under review when the first reviewer is assigned.
        </p>
        {pending.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">Nothing waiting for assignment.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pending.map((row) => (
              <li key={row.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{row.title}</p>
                    <p className="text-sm text-gray-600">
                      {row.participantMilestone.milestoneTemplate.name} ·{' '}
                      {row.participantMilestone.participant.user.name ||
                        row.participantMilestone.participant.user.email}
                    </p>
                    <p className="text-xs text-gray-500">Submitted {formatDate(row.submittedAt)}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={assignFor[row.id] ?? ''}
                      onChange={(e) => setAssignFor((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select reviewer…</option>
                      {reviewers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name || r.email}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void assign(row.id)}
                      className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {busyId === row.id ? 'Assigning…' : 'Assign'}
                    </button>
                    <Link
                      href={`/dashboard/evidence/${row.id}`}
                      className="text-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
