import { redirect } from 'next/navigation'
import { getAppSession } from '@/lib/get-app-session'
import { isAuthDisabled } from '@/lib/auth-disabled'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const devAuthBypass = isAuthDisabled()

  if (devAuthBypass) {
    const session = await getAppSession()
    if (session) {
      redirect('/dashboard')
    }
  }

  return <LoginForm devAuthBypass={devAuthBypass} />
}
