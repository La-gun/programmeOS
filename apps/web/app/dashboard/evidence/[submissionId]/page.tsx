import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import EvidenceSubmissionDetailClient from '@/components/EvidenceSubmissionDetailClient'
import { authOptions } from '@/lib/auth'
import { canReviewEvidence } from '@/lib/permissions'

export default async function EvidenceSubmissionPage({ params }: { params: { submissionId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }
  if (!canReviewEvidence(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <EvidenceSubmissionDetailClient submissionId={params.submissionId} />
    </div>
  )
}
