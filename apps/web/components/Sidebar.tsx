'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  DocumentIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['ADMIN', 'MANAGER', 'FACILITATOR', 'PARTICIPANT'] },
  { name: 'Programmes', href: '/dashboard/programmes', icon: AcademicCapIcon, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Cohorts', href: '/dashboard/cohorts', icon: UserGroupIcon, roles: ['ADMIN', 'MANAGER', 'FACILITATOR'] },
  { name: 'Participants', href: '/dashboard/participants', icon: UserGroupIcon, roles: ['ADMIN', 'MANAGER', 'FACILITATOR'] },
  { name: 'Documents', href: '/dashboard/documents', icon: DocumentIcon, roles: ['ADMIN', 'MANAGER', 'FACILITATOR', 'PARTICIPANT'] },
  { name: 'Messages', href: '/dashboard/messages', icon: ChatBubbleLeftRightIcon, roles: ['ADMIN', 'MANAGER', 'FACILITATOR', 'PARTICIPANT'] },
  { name: 'Settings', href: '/dashboard/settings', icon: CogIcon, roles: ['ADMIN'] },
]

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const userRole = session?.user.role || 'PARTICIPANT'
  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(userRole)
  )

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-gray-900">
            {session?.user.tenant.name}
          </h1>
        </div>
        <div className="mt-5 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
          <div className="flex items-center w-full">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {session?.user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {session?.user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {session?.user.role}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="ml-3 flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}