import { redirect } from 'next/navigation'
import EvidenceSubmissionDetailClient from '@/components/EvidenceSubmissionDetailClient'
import { getAppSession } from '@/lib/get-app-session'
import { canReviewEvidence } from '@/lib/permissions'

export default async function EvidenceSubmissionPage({ params }: { params: { submissionId: string } }) {
  const session = await getAppSession()
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
