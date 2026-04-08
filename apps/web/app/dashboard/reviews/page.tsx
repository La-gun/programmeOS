import { redirect } from 'next/navigation'
import ReviewsQueueClient from '@/components/ReviewsQueueClient'
import { getAppSession } from '@/lib/get-app-session'
import { canReviewEvidence } from '@/lib/permissions'

export default async function ReviewsPage() {
  const session = await getAppSession()
  if (!session) {
    redirect('/login')
  }
  if (!canReviewEvidence(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Evidence reviews</h1>
        <p className="mt-2 text-sm text-gray-600">
          Work your queue, assign reviewers to submitted evidence, and keep milestones moving.
        </p>
      </div>
      <ReviewsQueueClient />
    </div>
  )
}
