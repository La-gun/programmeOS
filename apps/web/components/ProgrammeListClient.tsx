'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ProgrammeCount = {
  cohorts: number
  milestoneTemplates: number
}

type ProgrammeWithCounts = {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  _count: ProgrammeCount
}

export default function ProgrammeListClient({ initialProgrammes }: { initialProgrammes: ProgrammeWithCounts[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/programmes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, startDate, endDate })
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body?.error || 'Unable to create programme.')
      }

      setName('')
      setDescription('')
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
    if (!confirm('Delete this programme?')) {
      return
    }

    try {
      const response = await fetch(`/api/programmes/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result?.error || 'Unable to delete programme.')
      }
      router.refresh()
    } catch (err) {
      setError(String(err))
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Create programme</h2>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Create programme'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Programme list</h2>
        <div className="mt-4 space-y-3">
          {initialProgrammes.length === 0 ? (
            <p className="text-sm text-gray-500">No programmes yet.</p>
          ) : (
            initialProgrammes.map((programme) => (
              <div key={programme.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/dashboard/programmes/${programme.id}`} className="text-lg font-semibold text-indigo-600 hover:text-indigo-800">
                      {programme.name}
                    </Link>
                    <p className="text-sm text-gray-500">{programme.description || 'No description provided.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <span>{programme._count.cohorts} cohorts</span>
                    <span>{programme._count.milestoneTemplates} milestone templates</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(programme.id)}
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
