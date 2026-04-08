import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getProgrammeById } from '@programmeos/prisma'
import ProgrammeDetailClient from '@/components/ProgrammeDetailClient'

export default async function ProgrammeDetailPage({ params }: { params: { programmeId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const programme = await getProgrammeById(params.programmeId, session.user.tenantId)
  if (!programme) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{programme.name}</h1>
          <p className="mt-2 text-sm text-gray-600">Programme details, cohorts, and milestone templates.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/programmes"
            className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Back to programmes
          </Link>
          <Link
            href="/dashboard/cohorts"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            View cohorts
          </Link>
        </div>
      </div>

      <ProgrammeDetailClient programme={programme} />
    </div>
  )
}
