import { getParticipantsForUser } from '@programmeos/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAppSession } from '@/lib/get-app-session'

export default async function MyMilestonesPage() {
  const session = await getAppSession()
  if (!session) {
    redirect('/login')
  }
  if (session.user.role !== 'PARTICIPANT') {
    redirect('/dashboard')
  }

  const rows = await getParticipantsForUser(session.user.id, session.user.tenantId)

  if (rows.length === 1) {
    redirect(`/dashboard/participants/${rows[0].id}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">My milestones</h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose an enrolment to manage evidence and milestone progress.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">You are not enrolled in any cohort yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="font-medium text-gray-900">{r.cohort.programme.name}</p>
                <p className="text-sm text-gray-600">{r.cohort.name}</p>
              </div>
              <Link
                href={`/dashboard/participants/${r.id}`}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
