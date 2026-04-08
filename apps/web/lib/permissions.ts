import type { Role } from '@prisma/client'

/** Roles that may manage programmes and milestone templates */
export const PROGRAMME_MANAGER_ROLES: Role[] = ['ADMIN', 'MANAGER']

/** Roles that may manage cohorts */
export const COHORT_MANAGER_ROLES: Role[] = ['ADMIN', 'MANAGER', 'FACILITATOR']

export function canManageProgrammes(role: Role): boolean {
  return PROGRAMME_MANAGER_ROLES.includes(role)
}

export function canManageCohorts(role: Role): boolean {
  return COHORT_MANAGER_ROLES.includes(role)
}

/** Enrolment and participant profile management (same as cohort managers). */
export function canManageParticipants(role: Role): boolean {
  return COHORT_MANAGER_ROLES.includes(role)
}

export function canViewAuditLog(role: Role): boolean {
  return role === 'ADMIN' || role === 'MANAGER'
}

/** Evidence review and reviewer assignment */
export function canReviewEvidence(role: Role): boolean {
  return COHORT_MANAGER_ROLES.includes(role)
}

export function canAccessParticipantRecord(
  role: Role,
  sessionUserId: string,
  participantUserId: string
): boolean {
  if (canManageParticipants(role)) {
    return true
  }
  return role === 'PARTICIPANT' && sessionUserId === participantUserId
}
