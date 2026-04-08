import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import SettingsAuditClient from '@/components/SettingsAuditClient'
import { authOptions } from '@/lib/auth'
import { canViewAuditLog } from '@/lib/permissions'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/login')
  }
  if (!canViewAuditLog(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">Workspace administration.</p>
      </div>

      {canViewAuditLog(session.user.role) && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Audit log</h2>
          <p className="mt-1 text-sm text-gray-500">
            Recent changes across participants, documents, cohorts, and other audited entities.
          </p>
          <div className="mt-4">
            <SettingsAuditClient />
          </div>
        </section>
      )}
    </div>
  )
}
