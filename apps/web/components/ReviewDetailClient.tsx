'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type ReviewPayload = {
  id: string
  status: string
  reviewerId: string
  documentRecords: Array<{ id: string; name: string; url: string; createdAt: string }>
  evidenceSubmission: {
    id: string
    title: string
    description: string | null
    status: string
    submittedAt: string | null
    participantMilestone: {
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
  reviewer: { id: string; name: string | null; email: string }
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export default function ReviewDetailClient({
  reviewId,
  canAct
}: {
  reviewId: string
  canAct: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState<ReviewPayload | null>(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/evidence-reviews/${reviewId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (!cancelled) {
          setError(body?.error || 'Unable to load review.')
        }
        return
      }
      const json = (await res.json()) as ReviewPayload
      if (!cancelled) {
        setData(json)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reviewId])

  const decide = async (decision: 'approve' | 'reject' | 'clarify') => {
    if (!data) {
      return
    }
    const trimmed = feedback.trim()
    if (decision !== 'approve' && trimmed.length === 0) {
      setError('Feedback is required for reject or request clarification.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const payload =
        decision === 'approve'
          ? { decision: 'approve' as const, ...(trimmed ? { feedback: trimmed } : {}) }
          : { decision, feedback: trimmed }
      const res = await fetch(`/api/evidence-reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Update failed.')
      }
      router.push('/dashboard/reviews')
      router.refresh()
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

  const pending = data.status === 'PENDING'

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
          / Assignment
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{data.evidenceSubmission.title}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {data.evidenceSubmission.participantMilestone.milestoneTemplate.name} ·{' '}
          {data.evidenceSubmission.participantMilestone.user.name ||
            data.evidenceSubmission.participantMilestone.user.email}
        </p>
        <p className="text-sm text-gray-500">
          Submission status: {data.evidenceSubmission.status.replace(/_/g, ' ')} · Submitted{' '}
          {formatDate(data.evidenceSubmission.submittedAt)}
        </p>
        {data.evidenceSubmission.description && (
          <p className="mt-4 text-sm text-gray-800">{data.evidenceSubmission.description}</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Evidence files</h2>
        {data.documentRecords.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No files attached.</p>
        ) : (
          <ul className="mt-4 space-y-2">
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
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">All assignments on this submission</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          {data.evidenceSubmission.reviews.map((r) => (
            <li key={r.id}>
              {r.reviewer.name || r.reviewer.email}: {r.status.replace(/_/g, ' ')}
            </li>
          ))}
        </ul>
      </div>

      {canAct && pending ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Your decision</h2>
          <p className="mt-1 text-sm text-gray-500">
            Approve requires all assigned reviewers to approve. Reject or request clarification ends the cycle for this
            submission (see audit log for traceability).
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="Feedback (required for reject or clarify)"
            className="mt-4 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void decide('approve')}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void decide('reject')}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void decide('clarify')}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              Request clarification
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {pending
            ? 'You can view this assignment, but only the assigned reviewer can act.'
            : `This assignment is ${data.status.replace(/_/g, ' ').toLowerCase()}.`}
        </p>
      )}
    </div>
  )
}
