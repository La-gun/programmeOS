import { redirect } from 'next/navigation'
import { getAppSession } from '@/lib/get-app-session'

export default async function Home() {
  const session = await getAppSession()

  if (session) {
    redirect('/dashboard')
  }

  redirect('/login')
}