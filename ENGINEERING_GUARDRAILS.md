# Engineering Guardrails

**Version**: 2.0  
**Last Updated**: April 2026

Standards for the ProgrammeOS **web platform** (TypeScript, Next.js, Prisma, PostgreSQL).

---

## Language and tooling

- **Languages**: TypeScript (strict), TSX for React.
- **Runtime**: Node.js 18+ for development and CI.
- **Package manager**: pnpm (workspace protocol for internal packages).
- **ORM**: Prisma; schema and migrations live in `packages/prisma`.
- **Lint**: ESLint with project configs (`@programmeos/config`).

---

## Code style

- Match existing files: imports, naming (`camelCase` functions, `PascalCase` components), and formatting.
- Prefer **explicit `tenantId`** (or relation filters) in Prisma queries for tenant-owned data; see [docs/TENANT_ISOLATION.md](docs/TENANT_ISOLATION.md).
- **Route Handlers**: authenticate/authorize first (`api-auth.ts`), then validate input (Zod in services or route), then call domain services.
- Do not add credentials, tokens, or PII to client bundles or logs.

---

## Testing

- **Targets**: Grow coverage on critical paths (authorization, tenant boundaries, payout/evidence state transitions) before chasing a single global percentage.
- **Organization**:
  - `apps/web/**/__tests__/*.test.ts` — app-level unit tests (e.g. permissions).
  - `packages/prisma/lib/**/__tests__/*.test.ts` — schema validation and service-safe helpers.
- **CI**: `pnpm lint` and `pnpm test` must pass before merge to the default branch.
- **New features**: add or extend tests when touching authz, money movement, or cross-tenant data access.

---

## Documentation

- Update **ARCHITECTURE.md** or **IMPLEMENTATION_PLAN.md** when changing major flows or integrations.
- New API surface or role behavior: update [docs/AUTHORIZATION_MATRIX.md](docs/AUTHORIZATION_MATRIX.md).

---

## Git workflow

- Branch names: `feature/…`, `fix/…`, `docs/…`, `chore/…`.
- Commits: Conventional-style prefixes (`feat:`, `fix:`, `test:`, `docs:`, `chore:`) with a short imperative subject.

---

## Pull requests

- [ ] Lint and tests pass locally (or CI green).
- [ ] Tenant-scoped queries reviewed for missing `tenantId` / relation filters.
- [ ] Authorization aligned with [docs/AUTHORIZATION_MATRIX.md](docs/AUTHORIZATION_MATRIX.md).
- [ ] No production use of `DISABLE_AUTH` or dev-only bypass patterns.

---

## Security and reliability

- **Secrets**: `NEXTAUTH_SECRET`, database URLs, provider keys only in server env; validate in production via `apps/web/lib/env.ts` (loaded from `instrumentation.ts`).
- **Sessions**: JWT contents stay minimal; do not store large or sensitive blobs in the token.
- **Uploads**: enforce limits and validate MIME/size; storage keys must remain non-guessable and tenant-scoped where applicable.
- **Dependencies**: prefer pinned ranges consistent with the monorepo; run `pnpm audit` periodically.

---

## Performance

- Avoid N+1 queries; use Prisma `include` / `select` deliberately.
- Cache only when correctness is clear (tenant + user isolation).

---

## Release checklist

- [ ] CI green on default branch
- [ ] Production env vars documented and validated
- [ ] Migrations applied in staging before production
- [ ] Rollback plan for schema and feature flags

---

## References

- [Next.js documentation](https://nextjs.org/docs)
- [Prisma documentation](https://www.prisma.io/docs)
- [NextAuth.js](https://next-auth.js.org/)
