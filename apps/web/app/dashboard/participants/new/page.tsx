import Link from 'next/link'
import { redirect } from 'next/navigation'
import { listCohortsForEnrollment, listTenantUsersForEnrollment } from '@programmeos/prisma'
import ParticipantNewClient from '@/components/ParticipantNewClient'
import { getAppSession } from '@/lib/get-app-session'
import { canManageParticipants } from '@/lib/permissions'

export default async function NewParticipantPage() {
  const session = await getAppSession()
  if (!session) {
    redirect('/login')
  }
  if (!canManageParticipants(session.user.role)) {
    redirect('/dashboard')
  }

  const [users, cohorts] = await Promise.all([
    listTenantUsersForEnrollment(session.user.tenantId),
    listCohortsForEnrollment(session.user.tenantId)
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Enrol participant</h1>
          <p className="mt-2 text-sm text-gray-600">
            Link an organization user to a cohort. Each user can only be enrolled once per cohort.
          </p>
        </div>
        <Link
          href="/dashboard/participants"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Back to list
        </Link>
      </div>

      {cohorts.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Create a programme and cohort before enrolling participants.
        </div>
      ) : (
        <ParticipantNewClient users={users} cohorts={cohorts} />
      )}
    </div>
  )
}
