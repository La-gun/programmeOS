import { getEvidenceReviewInTenant } from '@programmeos/prisma'
import { notFound, redirect } from 'next/navigation'
import ReviewDetailClient from '@/components/ReviewDetailClient'
import { getAppSession } from '@/lib/get-app-session'
import { canManageParticipants, canReviewEvidence } from '@/lib/permissions'

export default async function ReviewDetailPage({ params }: { params: { reviewId: string } }) {
  const session = await getAppSession()
  if (!session) {
    redirect('/login')
  }
  if (!canReviewEvidence(session.user.role)) {
    redirect('/dashboard')
  }

  const review = await getEvidenceReviewInTenant(params.reviewId, session.user.tenantId)
  if (!review) {
    notFound()
  }

  const isAssignee = review.reviewerId === session.user.id
  if (!isAssignee && !canManageParticipants(session.user.role)) {
    redirect('/dashboard/reviews')
  }

  const canAct = review.status === 'PENDING' && isAssignee

  return <ReviewDetailClient reviewId={params.reviewId} canAct={canAct} />
}
