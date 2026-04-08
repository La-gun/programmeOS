import { redirect } from 'next/navigation'
import PayoutBatchDetailClient from '@/components/PayoutBatchDetailClient'
import { getAppSession } from '@/lib/get-app-session'
import { canManagePayouts } from '@/lib/permissions'

type PageProps = { params: Promise<{ batchId: string }> }

export default async function PayoutBatchPage(props: PageProps) {
  const session = await getAppSession()
  if (!session) {
    redirect('/login')
  }
  if (!canManagePayouts(session.user.role)) {
    redirect('/dashboard')
  }

  const { batchId } = await props.params

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Payout batch</h1>
        <p className="mt-2 text-sm text-gray-600">Review lines, download CSV, and submit to the payment provider.</p>
      </div>
      <PayoutBatchDetailClient batchId={batchId} />
    </div>
  )
}
