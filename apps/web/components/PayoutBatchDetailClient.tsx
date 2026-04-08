'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

type BatchDetail = {
  id: string
  name: string | null
  status: string
  providerBatchRef: string | null
  failureReason: string | null
  createdAt: string
  items: Array<{
    id: string
    status: string
    amountMinor: number | null
    currency: string
    providerItemRef: string | null
    failureReason: string | null
    evidenceSubmission: {
      id: string
      title: string
      participantMilestone: {
        milestoneTemplate: { name: string }
        participant: {
          id: string
          user: { name: string | null; email: string }
          cohort: { name: string }
        }
      }
    }
  }>
}

export default function PayoutBatchDetailClient({ batchId }: { batchId: string }) {
  const router = useRouter()
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    const res = await fetch(`/api/payouts/batches/${batchId}`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body?.error || 'Failed to load batch.')
      setBatch(null)
      return
    }
    const data = (await res.json()) as BatchDetail
    setBatch(data)
  }, [batchId])

  useEffect(() => {
    void load()
  }, [load])

  const downloadCsv = () => {
    window.location.assign(`/api/payouts/batches/${batchId}/export`)
  }

  const cancelBatch = async () => {
    if (!confirm('Cancel this draft batch?')) {
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/payouts/batches/${batchId}/cancel`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || 'Could not cancel batch.')
      }
      router.push('/dashboard/payouts')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const submitToProvider = async () => {
    if (!confirm('Submit this batch to the configured payment provider? (Mock provider by default.)')) {
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/payouts/batches/${batchId}/submit`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || 'Submit failed.')
      }
      setBatch(body as BatchDetail)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!batch && !error) {
    return <p className="text-sm text-gray-600">Loading…</p>
  }

  if (!batch) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        <Link href="/dashboard/payouts" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          ← Back to payouts
        </Link>
      </div>
    )
  }

  const isDraft = batch.status === 'DRAFT'

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/payouts" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          ← All batches
        </Link>
        <span className="text-sm text-gray-400">|</span>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Download CSV
        </button>
        {isDraft ? (
          <>
            <button
              type="button"
              disabled={busy || batch.items.length === 0}
              onClick={() => void submitToProvider()}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Submit to payment provider
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancelBatch()}
              className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Cancel draft
            </button>
          </>
        ) : null}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">{batch.name || 'Untitled batch'}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="font-medium text-gray-900">{batch.status}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Provider batch ref</dt>
            <dd className="font-mono text-xs text-gray-900">{batch.providerBatchRef || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Notes</dt>
            <dd className="text-gray-800">{batch.failureReason || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-md font-semibold text-gray-900">Line items</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4">Submission</th>
                <th className="py-2 pr-4">Milestone</th>
                <th className="py-2 pr-4">Participant</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Item status</th>
                <th className="py-2 pr-4">Provider item ref</th>
                <th className="py-2 pr-4">Line note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batch.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-4 font-medium text-gray-900">{item.evidenceSubmission.title}</td>
                  <td className="py-2 pr-4 text-gray-700">
                    {item.evidenceSubmission.participantMilestone.milestoneTemplate.name}
                  </td>
                  <td className="py-2 pr-4 text-gray-700">
                    {item.evidenceSubmission.participantMilestone.participant.user.name ||
                      item.evidenceSubmission.participantMilestone.participant.user.email}
                  </td>
                  <td className="py-2 pr-4 text-gray-700">
                    {item.amountMinor != null ? `${item.amountMinor} ${item.currency}` : '—'}
                  </td>
                  <td className="py-2 pr-4 text-gray-700">{item.status}</td>
                  <td className="font-mono text-xs text-gray-600">{item.providerItemRef || '—'}</td>
                  <td className="max-w-xs text-xs text-gray-600">{item.failureReason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
