import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCohortList, getParticipantList } from '@programmeos/prisma'
import { getAppSession } from '@/lib/get-app-session'
import { canManageParticipants } from '@/lib/permissions'

export default async function ParticipantsPage({
  searchParams
}: {
  searchParams: { q?: string; cohortId?: string }
}) {
  const session = await getAppSession()
  if (!session) {
    redirect('/login')
  }
  if (!canManageParticipants(session.user.role)) {
    redirect('/dashboard')
  }

  const cohortId = searchParams.cohortId?.trim() || undefined
  const q = searchParams.q?.trim() || undefined

  const [participants, cohorts] = await Promise.all([
    getParticipantList(session.user.tenantId, { cohortId, search: q }),
    getCohortList(session.user.tenantId)
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Participants</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enrolment, consent, documents, and status history for your cohorts.
          </p>
        </div>
        <Link
          href="/dashboard/participants/new"
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Add participant
        </Link>
      </div>

      <form
        className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
        method="get"
      >
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium text-gray-500">Search</label>
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Name or email"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium text-gray-500">Cohort</label>
          <select
            name="cohortId"
            defaultValue={cohortId ?? ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All cohorts</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.programme.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Apply
        </button>
      </form>

      {cohorts.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Create a programme and cohort before enrolling participants.
        </div>
      ) : participants.length === 0 ? (
        <p className="text-sm text-gray-500">No participants match your filters.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Participant
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Cohort
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Consent / docs
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Open
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium text-gray-900">{p.user.name || p.user.email}</p>
                    <p className="text-gray-500">{p.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <p>{p.cohort.name}</p>
                    <p className="text-xs text-gray-500">{p.cohort.programme.name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize text-gray-800">{p.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p._count.consentRecords} consent · {p._count.documents} docs ·{' '}
                    {p._count.statusEvents} status events
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <Link
                      href={`/dashboard/participants/${p.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
