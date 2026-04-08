'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

type ProgrammeOption = { id: string; name: string }

type EligibleRow = {
  id: string
  title: string
  participantMilestone: {
    milestoneTemplate: { name: string }
    participant: {
      id: string
      user: { name: string | null; email: string }
      cohort: { name: string; programme: { id: string; name: string } }
    }
  }
}

type BatchSummary = {
  id: string
  name: string | null
  status: string
  createdAt: string
  _count: { items: number }
}

export default function PayoutsClient() {
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([])
  const [programmeId, setProgrammeId] = useState<string>('')
  const [eligible, setEligible] = useState<EligibleRow[]>([])
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [batchName, setBatchName] = useState('')
  const [amountMinor, setAmountMinor] = useState<string>('')
  const [currency, setCurrency] = useState('USD')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([id]) => id),
    [selected]
  )

  const loadProgrammes = async () => {
    const res = await fetch('/api/programmes')
    if (!res.ok) {
      return
    }
    const data = (await res.json()) as ProgrammeOption[]
    setProgrammes(data)
  }

  const loadEligible = useCallback(async () => {
    setError('')
    const qs = programmeId ? `?programmeId=${encodeURIComponent(programmeId)}` : ''
    const res = await fetch(`/api/payouts/eligible-submissions${qs}`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body?.error || 'Failed to load payout-ready submissions.')
      return
    }
    const data = (await res.json()) as { submissions: EligibleRow[] }
    setEligible(data.submissions)
    setSelected({})
  }, [programmeId])

  const loadBatches = async () => {
    const res = await fetch('/api/payouts/batches')
    if (!res.ok) {
      return
    }
    const data = (await res.json()) as { batches: BatchSummary[] }
    setBatches(data.batches)
  }

  const loadAll = async () => {
    await Promise.all([loadProgrammes(), loadEligible(), loadBatches()])
  }

  useEffect(() => {
    void loadProgrammes()
    void loadBatches()
  }, [])

  useEffect(() => {
    void loadEligible()
  }, [loadEligible])

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const createBatch = async () => {
    if (selectedIds.length === 0) {
      setError('Select at least one submission.')
      return
    }
    const amt = amountMinor.trim() === '' ? undefined : Number(amountMinor)
    if (amt !== undefined && (!Number.isFinite(amt) || amt < 0 || !Number.isInteger(amt))) {
      setError('Amount (minor units) must be a non-negative whole number or empty.')
      return
    }
    const cur = currency.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(cur)) {
      setError('Use a 3-letter currency code (e.g. USD).')
      return
    }

    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/payouts/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: batchName.trim() || undefined,
          items: selectedIds.map((evidenceSubmissionId) => ({
            evidenceSubmissionId,
            ...(amt !== undefined ? { amountMinor: amt, currency: cur } : { currency: cur })
          }))
        })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || 'Could not create batch.')
      }
      setBatchName('')
      setAmountMinor('')
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Payout-ready submissions</h2>
        <p className="mt-1 text-sm text-gray-600">
          Approved evidence with active participants, not already tied to an open or completed payout batch.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block text-sm text-gray-700">
            <span className="font-medium">Programme filter</span>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm sm:w-64"
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
            >
              <option value="">All programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadEligible()}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh list
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4">Include</th>
                <th className="py-2 pr-4">Submission</th>
                <th className="py-2 pr-4">Milestone</th>
                <th className="py-2 pr-4">Participant</th>
                <th className="py-2 pr-4">Cohort / programme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {eligible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-gray-500">
                    No payout-ready submissions for this filter.
                  </td>
                </tr>
              ) : (
                eligible.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[row.id])}
                        onChange={() => toggle(row.id)}
                        aria-label={`Include ${row.title}`}
                      />
                    </td>
                    <td className="py-2 pr-4 font-medium text-gray-900">{row.title}</td>
                    <td className="py-2 pr-4 text-gray-700">{row.participantMilestone.milestoneTemplate.name}</td>
                    <td className="py-2 pr-4 text-gray-700">
                      {row.participantMilestone.participant.user.name ||
                        row.participantMilestone.participant.user.email}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {row.participantMilestone.participant.cohort.name} ·{' '}
                      {row.participantMilestone.participant.cohort.programme.name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm text-gray-700">
            <span className="font-medium">Batch name (optional)</span>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. April stipends"
            />
          </label>
          <label className="block text-sm text-gray-700">
            <span className="font-medium">Amount (minor units, optional)</span>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
              value={amountMinor}
              onChange={(e) => setAmountMinor(e.target.value)}
              placeholder="e.g. 5000 for 50.00"
            />
          </label>
          <label className="block text-sm text-gray-700">
            <span className="font-medium">Currency</span>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              maxLength={3}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={busy || selectedIds.length === 0}
              onClick={() => void createBatch()}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {busy ? 'Creating…' : `Create draft batch (${selectedIds.length})`}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Batches</h2>
          <button
            type="button"
            onClick={() => void loadBatches()}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Items</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-gray-500">
                    No payout batches yet.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2 pr-4 font-medium text-gray-900">{b.name || '—'}</td>
                    <td className="py-2 pr-4 text-gray-700">{b.status}</td>
                    <td className="py-2 pr-4 text-gray-700">{b._count.items}</td>
                    <td className="py-2 pr-4 text-gray-600">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right">
                      <Link
                        href={`/dashboard/payouts/${b.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
