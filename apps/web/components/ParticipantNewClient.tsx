'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type UserOption = { id: string; name: string | null; email: string }
type CohortOption = {
  id: string
  name: string
  programme: { id: string; name: string }
}

export default function ParticipantNewClient({
  users,
  cohorts
}: {
  users: UserOption[]
  cohorts: CohortOption[]
}) {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? '')
  const [status, setStatus] = useState('active')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')

    try {
      const body: Record<string, unknown> = {
        userId,
        cohortId,
        status
      }
      if (bio.trim()) {
        body.profile = { bio: bio.trim() }
      }

      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(typeof data?.error === 'string' ? data.error : 'Unable to create participant.')
      }

      const created = (await response.json()) as { id: string }
      router.push(`/dashboard/participants/${created.id}`)
      router.refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <form className="mx-auto max-w-xl space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700">User</label>
          <select
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ? `${u.name} · ${u.email}` : u.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Cohort</label>
          <select
            required
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.programme.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Initial status</label>
          <input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="active"
          />
          <p className="mt-1 text-xs text-gray-500">
            Use lowercase labels such as active, paused, withdrawn, completed.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bio (optional)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Enrol participant'}
        </button>
      </form>
    </section>
  )
}
