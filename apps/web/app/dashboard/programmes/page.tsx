import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { canManageProgrammes } from '@/lib/permissions'
import { getProgrammeList } from '@programmeos/prisma'
import ProgrammeListClient from '@/components/ProgrammeListClient'

export default async function ProgrammesPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }
  if (!canManageProgrammes(session.user.role)) {
    redirect('/dashboard')
  }

  const programmes = await getProgrammeList(session.user.tenantId)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Programmes</h1>
          <p className="mt-2 text-sm text-gray-600">Create, edit, and manage programme cohorts and templates.</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Back to dashboard
        </Link>
      </div>

      <ProgrammeListClient initialProgrammes={programmes} />
    </div>
  )
}
