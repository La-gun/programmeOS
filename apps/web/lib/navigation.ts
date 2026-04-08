import type { Role } from '@prisma/client'
import type { ComponentType, SVGProps } from 'react'
import {
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  CogIcon,
  DocumentIcon,
  HomeIcon,
  UserGroupIcon,
  UsersIcon
} from '@heroicons/react/24/outline'

export type NavItem = {
  name: string
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  roles: Role[]
}

export const appNavigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    roles: ['ADMIN', 'MANAGER', 'FACILITATOR', 'PARTICIPANT']
  },
  {
    name: 'Programmes',
    href: '/dashboard/programmes',
    icon: AcademicCapIcon,
    roles: ['ADMIN', 'MANAGER']
  },
  {
    name: 'Cohorts',
    href: '/dashboard/cohorts',
    icon: UserGroupIcon,
    roles: ['ADMIN', 'MANAGER', 'FACILITATOR']
  },
  {
    name: 'Participants',
    href: '/dashboard/participants',
    icon: UsersIcon,
    roles: ['ADMIN', 'MANAGER', 'FACILITATOR']
  },
  {
    name: 'My milestones',
    href: '/dashboard/my-milestones',
    icon: ClipboardDocumentCheckIcon,
    roles: ['PARTICIPANT']
  },
  {
    name: 'Documents',
    href: '/dashboard/documents',
    icon: DocumentIcon,
    roles: ['ADMIN', 'MANAGER', 'FACILITATOR', 'PARTICIPANT']
  },
  {
    name: 'Reviews',
    href: '/dashboard/reviews',
    icon: ClipboardDocumentCheckIcon,
    roles: ['ADMIN', 'MANAGER', 'FACILITATOR']
  },
  {
    name: 'Messages',
    href: '/dashboard/messages',
    icon: ChatBubbleLeftRightIcon,
    roles: ['ADMIN', 'MANAGER', 'FACILITATOR', 'PARTICIPANT']
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: CogIcon,
    roles: ['ADMIN', 'MANAGER']
  }
]

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
