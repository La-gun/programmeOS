import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  getParticipantsForUser,
  listDocumentsForParticipantUser,
  listDocumentsForTenant
} from '@programmeos/prisma'
import DocumentsPageClient from '@/components/DocumentsPageClient'
import { authOptions } from '@/lib/auth'
import { canManageParticipants } from '@/lib/permissions'

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const isManager = canManageParticipants(session.user.role)

  if (isManager) {
    const documents = await listDocumentsForTenant(session.user.tenantId)
    const serialized = JSON.parse(JSON.stringify(documents)) as typeof documents
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Documents</h1>
          <p className="mt-2 text-sm text-gray-600">
            Tenant files with optional participant linkage. Configure persistent storage with{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">UPLOAD_DIR</code>.
          </p>
        </div>
        <DocumentsPageClient
          mode="manager"
          initialDocuments={serialized}
          participantOptions={null}
          defaultParticipantId={null}
        />
      </div>
    )
  }

  const enrolments = await getParticipantsForUser(session.user.id, session.user.tenantId)

  if (enrolments.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Your documents</h1>
          <p className="mt-2 text-sm text-gray-600">You are not enrolled in a cohort yet.</p>
        </div>
      </div>
    )
  }

  const documents = await listDocumentsForParticipantUser(session.user.tenantId, session.user.id)
  const serialized = JSON.parse(JSON.stringify(documents)) as typeof documents

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Your documents</h1>
        <p className="mt-2 text-sm text-gray-600">
          Files linked to your enrolments. Open your{' '}
          <Link
            href={`/dashboard/participants/${enrolments[0]!.id}`}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            participant record
          </Link>{' '}
          for consent and status history.
        </p>
      </div>
      <DocumentsPageClient
        mode="participant"
        initialDocuments={serialized}
        participantOptions={enrolments.map((e) => ({
          id: e.id,
          label: `${e.cohort.name} · ${e.cohort.programme.name}`
        }))}
        defaultParticipantId={enrolments[0]!.id}
      />
    </div>
  )
}
