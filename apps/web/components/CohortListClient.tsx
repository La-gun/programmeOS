'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ProgrammeOption = {
  id: string
  name: string
}

type CohortItem = {
  id: string
  name: string
  startDate: string | Date | null
  endDate: string | Date | null
  programme: ProgrammeOption
}

function formatListDate(value: string | Date | null): string {
  if (value == null) {
    return ''
  }
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString()
}

export default function CohortListClient({
  initialCohorts,
  programmeOptions
}: {
  initialCohorts: CohortItem[]
  programmeOptions: ProgrammeOption[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [programmeId, setProgrammeId] = useState(programmeOptions[0]?.id || '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programmeId, name, startDate, endDate })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to create cohort.')
      }

      setName('')
      setStartDate('')
      setEndDate('')
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cohort?')) {
      return
    }

    try {
      const response = await fetch(`/api/cohorts/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to delete cohort.')
      }
      router.refresh()
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Create cohort</h2>
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
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
            <label className="block text-sm font-medium text-gray-700">Programme</label>
            <select
              value={programmeId}
              onChange={(event) => setProgrammeId(event.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              {programmeOptions.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.name}
                </option>
              ))}
            </select>
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
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Create cohort'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Cohort list</h2>
        <div className="mt-4 space-y-3">
          {initialCohorts.length === 0 ? (
            <p className="text-sm text-gray-500">No cohorts found.</p>
          ) : (
            initialCohorts.map((cohort) => (
              <div key={cohort.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/dashboard/cohorts/${cohort.id}`} className="text-lg font-semibold text-indigo-600 hover:text-indigo-800">
                      {cohort.name}
                    </Link>
                    <p className="text-sm text-gray-500">{cohort.programme.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatListDate(cohort.startDate) || 'No start date'} –{' '}
                      {formatListDate(cohort.endDate) || 'No end date'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/programmes/${cohort.programme.id}`}
                      className="rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-200"
                    >
                      Programme
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(cohort.id)}
                      className="rounded-md bg-red-50 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
