'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

const demoAccounts = [
  { email: 'admin@example.com', role: 'ADMIN' },
  { email: 'manager@example.com', role: 'MANAGER' },
  { email: 'facilitator@example.com', role: 'FACILITATOR' },
  { email: 'participant@example.com', role: 'PARTICIPANT' }
] as const

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl
      })

      if (result?.error) {
        setError('Invalid email or password.')
        return
      }

      router.push(result?.url ?? callbackUrl)
      router.refresh()
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            ProgrammeOS
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to your organisation workspace
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl backdrop-blur">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  placeholder="you@organisation.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-300"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error ? (
              <p
                className="text-center text-sm text-red-400"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-indigo-500 px-3 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-4">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            Demo accounts
          </p>
          <p className="mt-1 text-center text-xs text-slate-500">
            Password for all: <span className="text-slate-300">password</span>
          </p>
          <ul className="mt-3 divide-y divide-slate-800 text-sm text-slate-400">
            {demoAccounts.map((row) => (
              <li
                key={row.email}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <span className="truncate text-slate-300">{row.email}</span>
                <span className="ml-2 shrink-0 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {row.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
