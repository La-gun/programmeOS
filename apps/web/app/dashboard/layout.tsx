import { redirect } from 'next/navigation'
import { getAppSession } from '@/lib/get-app-session'
import { DashboardShell } from '@/components/DashboardShell'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getAppSession()

  if (!session) {
    redirect('/login')
  }

  return <DashboardShell>{children}</DashboardShell>
}
