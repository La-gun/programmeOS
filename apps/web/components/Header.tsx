'use client'

import { useSession } from 'next-auth/react'
import { Bars3Icon } from '@heroicons/react/24/outline'

type HeaderProps = {
  onOpenMobileNav: () => void
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const { data: session } = useSession()
  const tenant = session?.user.tenant

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur">
      <button
        type="button"
        className="border-r border-slate-200 px-4 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open sidebar"
      >
        <Bars3Icon className="h-6 w-6" aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {session?.user.name ?? 'Signed in'}
          </p>
          <p className="truncate text-xs text-slate-500">
            {tenant?.name}
            {tenant?.domain ? (
              <span className="text-slate-400"> · {tenant.domain}</span>
            ) : null}
          </p>
        </div>
        {session?.user.role ? (
          <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline">
            {session.user.role}
          </span>
        ) : null}
      </div>
    </header>
  )
}
