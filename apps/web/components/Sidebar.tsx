'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRightOnRectangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { Role } from '@prisma/client'
import { appNavigation, isNavActive } from '@/lib/navigation'

type SidebarProps = {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

function NavList({
  onNavigate,
  role
}: {
  onNavigate?: () => void
  role: Role
}) {
  const pathname = usePathname()
  const items = appNavigation.filter((item) => item.roles.includes(role))

  return (
    <nav className="flex-1 space-y-1 px-2">
      {items.map((item) => {
        const active = pathname ? isNavActive(pathname, item.href) : false
        const Icon = item.icon
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
              active
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Icon
              className={`mr-3 h-5 w-5 shrink-0 ${
                active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'
              }`}
              aria-hidden
            />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { data: session } = useSession()
  const role = (session?.user.role ?? 'PARTICIPANT') as Role
  const tenantName = session?.user.tenant?.name ?? 'Workspace'

  const shell = (
    <div className="flex h-full flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex h-16 shrink-0 items-center border-b border-slate-800 px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-white">{tenantName}</p>
          <p className="truncate text-xs text-slate-500">ProgrammeOS</p>
        </div>
        {onMobileClose ? (
          <button
            type="button"
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={onMobileClose}
            aria-label="Close menu"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto pt-4 pb-4">
        <NavList role={role} onNavigate={onMobileClose} />
      </div>

      <div className="shrink-0 border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-medium text-indigo-200">
            {session?.user.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-200">
              {session?.user.name ?? 'User'}
            </p>
            <p className="truncate text-xs text-slate-500">{role}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Sign out"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        {shell}
      </div>

      {/* Mobile */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          mobileOpen ? '' : 'pointer-events-none'
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-slate-950/70 transition-opacity ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onMobileClose}
          aria-label="Close menu backdrop"
        />
        <div
          className={`absolute inset-y-0 left-0 flex w-64 max-w-[85vw] shadow-xl transition-transform ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {shell}
        </div>
      </div>
    </>
  )
}
