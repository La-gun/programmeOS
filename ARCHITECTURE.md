# Architecture

**Version**: 2.0  
**Last Updated**: April 2026  
**Status**: Active (web platform)

## System overview

ProgrammeOS is a **TypeScript monorepo**: a Next.js application backed by PostgreSQL (via Prisma), with shared packages for the database layer and UI.

```
┌─────────────────────────────────────────────────────────┐
│  Browser — React (App Router, Server/Client components) │
├─────────────────────────────────────────────────────────┤
│  apps/web — Route Handlers (REST), middleware, auth     │
├─────────────────────────────────────────────────────────┤
│  packages/prisma — schema, services, integrations       │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL                                             │
└─────────────────────────────────────────────────────────┘
```

---

## Packages

| Package | Role |
|---------|------|
| `apps/web` | HTTP API, dashboard UI, NextAuth, messaging/payment/AI adapters at the edge of the app |
| `packages/prisma` | Schema, migrations, `PrismaClient`, domain services (`lib/services/*`) |
| `packages/ui` | Shared React components |
| `packages/config` | Shared TypeScript / ESLint config |

---

## Authentication and session

- **NextAuth** with **Credentials** provider: email + bcrypt `passwordHash` on `User`.
- **JWT sessions** (not database sessions). The Prisma adapter remains for account linking if OAuth is added later.
- **`getAppSession()`** (`apps/web/lib/get-app-session.ts`) is the single server entry point: uses `getServerSession`, then optional **dev bypass** when `DISABLE_AUTH=true` and `NODE_ENV !== 'production'`.
- Session carries **`tenantId`**, **`role`**, and tenant summary for UI.

---

## Authorization

- **Roles**: `ADMIN`, `MANAGER`, `FACILITATOR`, `PARTICIPANT` (Prisma enum).
- **Route Handlers** call helpers in `apps/web/lib/api-auth.ts` (`requireProgrammeManager`, `requireSession`, etc.).
- **Capability logic** lives in `apps/web/lib/permissions.ts`.
- **Canonical matrix**: [docs/AUTHORIZATION_MATRIX.md](docs/AUTHORIZATION_MATRIX.md). New routes must update the matrix and add tests where practical.

---

## Multi-tenancy

- Each `User` belongs to one **`Tenant`**. Programme data is scoped by `tenantId` on aggregate roots (e.g. `Programme`, `Document`) or via relations (e.g. `Participant` → `Cohort` → `Programme` → `tenantId`).
- API handlers pass **`session.user.tenantId`** into service functions; services must not trust client-supplied tenant ids for authorization.
- **Defense in depth**: application-layer scoping is required today; optional **PostgreSQL RLS** is described in [docs/TENANT_ISOLATION.md](docs/TENANT_ISOLATION.md).
- Reusable filters: `packages/prisma/lib/tenant-scope.ts`.

---

## Domain services

Business logic is concentrated under **`packages/prisma/lib/services/`** (evidence, payouts, integrity, participants, etc.) to keep Route Handlers thin. Services accept **`tenantId`** (or derive it via joins) for tenant-scoped reads and writes.

---

## Integrations

- **Messaging**: WhatsApp Cloud and mock provider; idempotency helpers under `apps/web/lib/messaging/`.
- **Payments**: Provider interface with mock implementation (`packages/prisma/lib/payments/`).
- **AI**: Text provider interface with mock and optional OpenAI adapter (`packages/prisma/lib/ai/`).
- Stages and exit criteria: [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

---

## Data flow (example)

```
Dashboard → fetch('/api/programmes') 
  → requireProgrammeManager() 
  → getProgrammeList(session.user.tenantId)
  → Prisma (tenant-scoped query)
```

---

## Security notes

- **`DISABLE_AUTH`**: blocked in production (`apps/web/lib/auth-disabled.ts`); never enable in deployed environments.
- **Uploads and webhooks**: validate size, type, and signatures; treat provider callbacks as untrusted input.
- **AI output**: stored as suggestions only; never authoritative for compliance decisions without human review.

---

## Testing strategy

- **Unit**: `permissions`, Zod schemas, pure helpers (Jest).
- **Integration**: API + database (future expansion; use dedicated test DB and transactions or containers).
- **CI**: lint, `prisma generate`, test, `next build` with safe CI env vars.

---

## Operational metrics

Product-level SLOs and dashboards are defined in [docs/OPERATIONAL_METRICS.md](docs/OPERATIONAL_METRICS.md).

---

## Related documents

- [Implementation plan](IMPLEMENTATION_PLAN.md)
- [Engineering guardrails](ENGINEERING_GUARDRAILS.md)
- [Copilot tasks](COPILOT_TASKS.md)
