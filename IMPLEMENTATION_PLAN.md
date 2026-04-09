# Implementation Plan

**Version**: 2.0  
**Last Updated**: April 2026  
**Status**: In progress (web platform)

## Project vision

**ProgrammeOS** is a multi-tenant web platform for running programmes: cohorts, participants, evidence submissions, reviews, integrity workflows, payouts, and messaging (including WhatsApp). The name refers to an “operating system” for programme delivery—not a hardware OS kernel.

---

## Phase 1: Foundation (complete / iterate)

- [x] Monorepo (pnpm workspaces, Turbo)
- [x] Next.js App Router app (`apps/web`)
- [x] Prisma + PostgreSQL schema and migrations
- [x] Authentication (NextAuth, credentials, JWT sessions, tenant-aware session)
- [x] Role-based API guards (`apps/web/lib/api-auth.ts`, `permissions.ts`)
- [x] CI green on every PR (GitHub Actions — `.github/workflows/ci.yml`)
- [x] Baseline automated tests (permissions, Zod schemas; extend for API/tenant integration)
- [x] Production env validation (`apps/web/lib/env.ts` + `instrumentation.ts`)
- [ ] Observability baselines (structured logging, dashboards — see `docs/OPERATIONAL_METRICS.md`)

**Timeline**: Ongoing  
**Dependencies**: None

---

## Phase 2: Product hardening

- [ ] Expand integration tests for cross-tenant isolation (API + services)
- [ ] Rate limiting and abuse controls on sensitive Route Handlers (uploads, messaging)
- [ ] Optional PostgreSQL row-level security (RLS) behind transactional `set_config` (see `docs/TENANT_ISOLATION.md`)
- [ ] Structured logging and error reporting (correlation IDs)

**Timeline**: 4–8 weeks  
**Dependencies**: Phase 1 test/CI baseline

---

## Phase 3: External integrations (production)

- [ ] Payments: move from mock provider to sandbox, then production (see `docs/INTEGRATIONS.md`)
- [ ] AI: provider keys, quotas, retention policy, human-in-the-loop review
- [ ] WhatsApp Cloud: webhook hardening, signature verification, monitoring

**Timeline**: Parallel tracks per integration  
**Dependencies**: Phase 2 operational readiness

---

## Phase 4: Scale and compliance

- [ ] Performance targets and load testing (see `docs/OPERATIONAL_METRICS.md`)
- [ ] Backup, restore, and data retention procedures
- [ ] Accessibility and internationalization as needed

---

## Success metrics (web platform)

| Metric | Target |
|--------|--------|
| CI | Lint + test + build required on default branch |
| Critical-path tests | Authz matrix covered; tenant boundary tests for key resources |
| Uptime | Defined per deployment (e.g. hosting SLA), not placeholder percentages |
| Security | No `DISABLE_AUTH` in production; secrets validated at boot in production |

---

## Milestones

- [x] v0.1.0 – Core domain model and dashboard
- [ ] v0.2.0 – CI + critical-path test suite
- [ ] v0.3.0 – Production-hardened integrations (payments / messaging / AI)
- [ ] v1.0.0 – Operational runbooks, SLOs, and compliance baseline

---

## Related documents

- [Architecture](ARCHITECTURE.md)
- [Engineering guardrails](ENGINEERING_GUARDRAILS.md)
- [Authorization matrix](docs/AUTHORIZATION_MATRIX.md)
- [Tenant isolation](docs/TENANT_ISOLATION.md)
- [Integrations](docs/INTEGRATIONS.md)
- [Operational metrics](docs/OPERATIONAL_METRICS.md)
