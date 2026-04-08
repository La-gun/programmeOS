import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getCohortList, getProgrammeList } from '@programmeos/prisma'
import CohortListClient from '@/components/CohortListClient'

export default async function CohortsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const [cohorts, programmes] = await Promise.all([
    getCohortList(session.user.tenantId),
    getProgrammeList(session.user.tenantId)
  ])

  const programmeOptions = programmes.map((programme) => ({
    id: programme.id,
    name: programme.name
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Cohorts</h1>
          <p className="mt-2 text-sm text-gray-600">Manage cohort membership and cohort scheduling.</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Back to dashboard
        </Link>
      </div>

      <CohortListClient initialCohorts={cohorts} programmeOptions={programmeOptions} />
    </div>
  )
}
