# Authorization matrix

**Role × capability** for ProgrammeOS Route Handlers and server actions.  
**Source of truth in code**: `apps/web/lib/permissions.ts` and `apps/web/lib/api-auth.ts`.

| Capability | ADMIN | MANAGER | FACILITATOR | PARTICIPANT |
|------------|:-----:|:-------:|:-----------:|:-----------:|
| Manage programmes & milestone templates | ✓ | ✓ | — | — |
| Manage cohorts | ✓ | ✓ | ✓ | — |
| Manage participants (enrolment, profile ops) | ✓ | ✓ | ✓ | — |
| View audit log | ✓ | ✓ | — | — |
| Manage payout batches | ✓ | ✓ | — | — |
| Evidence review queue, assignments, integrity queue | ✓ | ✓ | ✓ | — |
| Access own participant record | ✓ | ✓ | ✓ | ✓ (self only) |

### Participant self-access

`canAccessParticipantRecord(role, sessionUserId, participantUserId)` allows **PARTICIPANT** only when the participant’s linked `userId` matches the session user. Staff roles bypass this check for management operations.

### When adding a new Route Handler

1. Choose the narrowest `require*` helper from `api-auth.ts`.
2. Pass **`session.user.tenantId`** into Prisma services (never trust body/query for tenant).
3. Update this matrix and add a test if the rule is new or non-obvious.
