'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ProgrammeSummary = {
  id: string
  name: string
}

type CohortDetail = {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  programme: ProgrammeSummary
}

export default function CohortDetailClient({ cohort }: { cohort: CohortDetail }) {
  const router = useRouter()
  const [name, setName] = useState(cohort.name)
  const [startDate, setStartDate] = useState(cohort.startDate ?? '')
  const [endDate, setEndDate] = useState(cohort.endDate ?? '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/cohorts/${cohort.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startDate, endDate })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to update cohort.')
      }

      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this cohort?')) {
      return
    }
    try {
      const response = await fetch(`/api/cohorts/${cohort.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to delete cohort.')
      }
      router.push('/dashboard/cohorts')
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Cohort details</h2>
            <p className="text-sm text-gray-500">Assigned programme: {cohort.programme.name}</p>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Delete cohort
          </button>
        </div>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleUpdate}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
