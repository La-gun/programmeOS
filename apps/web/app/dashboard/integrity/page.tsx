import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import IntegrityQueueClient from '@/components/IntegrityQueueClient'
import { authOptions } from '@/lib/auth'
import { canReviewEvidence } from '@/lib/permissions'

export default async function IntegrityPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }
  if (!canReviewEvidence(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Integrity</h1>
        <p className="mt-2 text-sm text-gray-600">
          Rules-based checks on evidence submissions: shared contact details and unusual submission pace. Each item
          is explainable and logged for audit.
        </p>
      </div>
      <IntegrityQueueClient />
    </div>
  )
}
