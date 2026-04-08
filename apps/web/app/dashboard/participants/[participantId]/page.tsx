import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCohortList, getParticipantById } from '@programmeos/prisma'
import ParticipantDetailClient from '@/components/ParticipantDetailClient'
import ParticipantMilestonesClient from '@/components/ParticipantMilestonesClient'
import { authOptions } from '@/lib/auth'
import {
  canAccessParticipantRecord,
  canManageParticipants,
  canViewAuditLog
} from '@/lib/permissions'

export default async function ParticipantDetailPage({ params }: { params: { participantId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }

  const participant = await getParticipantById(params.participantId, session.user.tenantId)
  if (!participant) {
    notFound()
  }

  if (!canAccessParticipantRecord(session.user.role, session.user.id, participant.userId)) {
    redirect('/dashboard')
  }

  const isManager = canManageParticipants(session.user.role)
  const cohorts = isManager ? await getCohortList(session.user.tenantId) : []

  const cohortOptions = cohorts.map((c) => ({
    id: c.id,
    name: c.name,
    programme: { id: c.programme.id, name: c.programme.name }
  }))

  const serialized = JSON.parse(JSON.stringify(participant)) as typeof participant

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Participant</h1>
          <p className="mt-2 text-sm text-gray-600">Milestones, evidence, consent, documents, and enrolment history.</p>
        </div>
        {isManager && (
          <Link
            href="/dashboard/participants"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Back to list
          </Link>
        )}
      </div>

      <ParticipantDetailClient
        participant={serialized}
        cohortOptions={cohortOptions}
        isManager={isManager}
        canViewAudit={canViewAuditLog(session.user.role)}
      />

      <ParticipantMilestonesClient
        participantId={participant.id}
        isManager={isManager}
        isParticipantSelf={session.user.id === participant.userId}
      />
    </div>
  )
}
