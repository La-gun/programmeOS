import type { Role } from '@prisma/client'
import {
  canAccessParticipantRecord,
  canManageCohorts,
  canManageParticipants,
  canManagePayouts,
  canManageProgrammes,
  canReviewEvidence,
  canViewAuditLog
} from '../permissions'

describe('permissions', () => {
  const staffRoles: Role[] = ['ADMIN', 'MANAGER', 'FACILITATOR', 'PARTICIPANT']

  it('restricts programme management to admin and manager', () => {
    expect(canManageProgrammes('ADMIN')).toBe(true)
    expect(canManageProgrammes('MANAGER')).toBe(true)
    expect(canManageProgrammes('FACILITATOR')).toBe(false)
    expect(canManageProgrammes('PARTICIPANT')).toBe(false)
  })

  it('allows facilitators to manage cohorts and participants', () => {
    expect(canManageCohorts('FACILITATOR')).toBe(true)
    expect(canManageParticipants('FACILITATOR')).toBe(true)
  })

  it('restricts audit log to admin and manager', () => {
    expect(canViewAuditLog('ADMIN')).toBe(true)
    expect(canViewAuditLog('MANAGER')).toBe(true)
    expect(canViewAuditLog('FACILITATOR')).toBe(false)
  })

  it('restricts payouts to admin and manager', () => {
    expect(canManagePayouts('MANAGER')).toBe(true)
    expect(canManagePayouts('FACILITATOR')).toBe(false)
  })

  it('allows cohort managers to review evidence', () => {
    expect(canReviewEvidence('FACILITATOR')).toBe(true)
    expect(canReviewEvidence('PARTICIPANT')).toBe(false)
  })

  it('lets participants access only their own participant user id', () => {
    expect(
      canAccessParticipantRecord('PARTICIPANT', 'user-a', 'user-a')
    ).toBe(true)
    expect(
      canAccessParticipantRecord('PARTICIPANT', 'user-a', 'user-b')
    ).toBe(false)
  })

  it('lets staff access any participant record', () => {
    for (const role of ['ADMIN', 'MANAGER', 'FACILITATOR'] as Role[]) {
      expect(canAccessParticipantRecord(role, 'staff-1', 'other')).toBe(true)
    }
  })

  it('covers every role for programme management expectation', () => {
    const allowed: Role[] = ['ADMIN', 'MANAGER']
    for (const role of staffRoles) {
      expect(canManageProgrammes(role)).toBe(allowed.includes(role))
    }
  })
})
