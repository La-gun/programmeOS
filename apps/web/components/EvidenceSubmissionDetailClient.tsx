'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type SubmissionPayload = {
  id: string
  title: string
  description: string | null
  status: string
  submittedAt: string | null
  documents: string[]
  documentRecords: Array<{ id: string; name: string; url: string; createdAt: string }>
  participantMilestone: {
    id: string
    participant: {
      id: string
      user: { name: string | null; email: string }
    }
    milestoneTemplate: { name: string }
  }
  reviews: Array<{
    id: string
    status: string
    reviewer: { name: string | null; email: string }
  }>
}

type ReviewerOption = { id: string; name: string | null; email: string }

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export default function EvidenceSubmissionDetailClient({ submissionId }: { submissionId: string }) {
  const [data, setData] = useState<SubmissionPayload | null>(null)
  const [reviewers, setReviewers] = useState<ReviewerOption[]>([])
  const [reviewerId, setReviewerId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setError('')
    const [sRes, rRes] = await Promise.all([
      fetch(`/api/evidence-submissions/${submissionId}`),
      fetch('/api/evidence-submissions/pending-assignment')
    ])
    if (!sRes.ok) {
      const body = await sRes.json().catch(() => ({}))
      setError(body?.error || 'Not found.')
      return
    }
    setData((await sRes.json()) as SubmissionPayload)
    if (rRes.ok) {
      const pack = (await rRes.json()) as { reviewers: ReviewerOption[] }
      setReviewers(pack.reviewers)
    }
  }

  useEffect(() => {
    void load()
  }, [submissionId])

  const assign = async () => {
    if (!reviewerId) {
      setError('Select a reviewer.')
      return
    }
    setBusy(true)
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
      setReviewerId('')
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) {
    return <p className="text-sm text-red-700">{error}</p>
  }
  if (!data) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  const canAssign = data.status === 'SUBMITTED' || data.status === 'UNDER_REVIEW'

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">
          <Link href="/dashboard/reviews" className="font-medium text-indigo-600 hover:text-indigo-500">
            Reviews
          </Link>{' '}
          / Evidence
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{data.title}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {data.participantMilestone.milestoneTemplate.name} ·{' '}
          {data.participantMilestone.user.name || data.participantMilestone.user.email}
        </p>
        <p className="text-sm text-gray-500">
          Status: {data.status.replace(/_/g, ' ')} · Submitted {formatDate(data.submittedAt)}
        </p>
        {data.description && <p className="mt-4 text-sm text-gray-800">{data.description}</p>}
        <Link
          href={`/dashboard/participants/${data.participantMilestone.participant.id}`}
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          View participant
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Files</h2>
        <ul className="mt-3 space-y-2">
          {data.documentRecords.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                {doc.name}
              </a>
              <span className="text-xs text-gray-500"> · {formatDate(doc.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Review assignments</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          {data.reviews.length === 0 ? (
            <li>No reviewers assigned yet.</li>
          ) : (
            data.reviews.map((r) => (
              <li key={r.id}>
                {r.reviewer.name || r.reviewer.email}: {r.status.replace(/_/g, ' ')}
                {r.status === 'PENDING' ? (
                  <Link
                    href={`/dashboard/reviews/${r.id}`}
                    className="ml-2 text-indigo-600 hover:text-indigo-500"
                  >
                    Open
                  </Link>
                ) : null}
              </li>
            ))
          )}
        </ul>

        {canAssign && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Assign reviewer…</option>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.email}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() => void assign()}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Assign reviewer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
