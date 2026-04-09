# Tenant isolation

## Current model (application layer)

- The session provides **`tenantId`** after authentication (`getAppSession`).
- **Route Handlers** pass `tenantId` into **`packages/prisma/lib/services/*`** functions.
- Some resources are scoped **indirectly**, e.g. `Participant` via `cohort.programme.tenantId`. Use helpers such as **`assertParticipantInTenant`** in `participantService.ts` before acting on a participant id.

## PR checklist (tenant safety)

1. Does every `findFirst` / `findMany` / `update` / `delete` for tenant-owned data include **`tenantId`** or a relation filter to the tenant (e.g. `cohort: { programme: { tenantId } }`)?
2. For **id-based** access (`participantId`, `documentId`, …), does the code use a service that **re-validates** membership in the tenant?
3. Are **admin-style** cross-tenant queries avoided? (There should be none in normal operation.)

## Optional hardening: PostgreSQL RLS

Row-level security can enforce tenant boundaries even if application code regresses.

**Constraint**: With connection pooling, `SET app.tenant_id = '…'` on a bare connection is unsafe. Use **`SET LOCAL`** inside a **transaction** so the setting is scoped to that transaction only:

```sql
SELECT set_config('app.tenant_id', $1, true);
```

**Adoption path**:

1. Introduce a request-scoped transactional client (all reads/writes for one HTTP request share one transaction), **or** use a pooler mode compatible with RLS session variables.
2. Add RLS policies on tables with direct `tenant_id` (`programmes`, `documents`, `payout_batches`, `integrity_cases`, etc.).
3. For tables **without** `tenant_id` (e.g. `participants`), use policies that join to `cohorts` → `programmes` → `tenant_id`, or denormalize `tenant_id` where justified.

Until RLS is enabled end-to-end, **application-layer scoping remains mandatory**.

## Shared helpers

`packages/prisma/lib/tenant-scope.ts` provides small **`where`** fragments for direct `tenantId` columns to reduce copy-paste errors.
