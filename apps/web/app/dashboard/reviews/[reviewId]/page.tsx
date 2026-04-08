import { getEvidenceReviewInTenant } from '@programmeos/prisma'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import ReviewDetailClient from '@/components/ReviewDetailClient'
import { authOptions } from '@/lib/auth'
import { canManageParticipants, canReviewEvidence } from '@/lib/permissions'

export default async function ReviewDetailPage({ params }: { params: { reviewId: string } }) {
  const session = await getServerSession(authOptions)
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
