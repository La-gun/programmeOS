import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import PayoutsClient from '@/components/PayoutsClient'
import { authOptions } from '@/lib/auth'
import { canManagePayouts } from '@/lib/permissions'

export default async function PayoutsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }
  if (!canManagePayouts(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Payouts</h1>
        <p className="mt-2 text-sm text-gray-600">
          Build draft batches from approved evidence, export CSV for finance, and process payments via the
          configured provider (mock by default).
        </p>
      </div>
      <PayoutsClient />
    </div>
  )
}
