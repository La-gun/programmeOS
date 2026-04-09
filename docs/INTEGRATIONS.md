# Integration maturity

External systems move through explicit stages. Each stage has **exit criteria** before promotion.

## Stages

| Stage | Purpose | Exit criteria |
|-------|---------|----------------|
| **Mock** | Local dev, demos | Deterministic behavior; no real PII or money |
| **Sandbox** | Partner test environments | Webhooks verified; idempotency keys honored; error taxonomy mapped |
| **Production** | Live users | Monitoring, alerts, runbooks, key rotation, legal/compliance sign-off |

## Messaging (WhatsApp / internal)

- Enforce **idempotency** on inbound/outbound provider message ids (see `apps/web/lib/messaging/idempotency.ts`).
- **Webhooks**: verify signatures; reject replayed or stale events.
- Log delivery failures with enough context to reconcile without logging message body content where policy forbids it.

## Payments

- **Never** store card or bank details in ProgrammeOS tables; only opaque provider references (`providerBatchRef`, `providerItemRef`).
- Mock provider in `packages/prisma/lib/payments/mockAdapter.ts` must mirror **state transitions** expected from a real provider before swap.

## AI

- Suggestions are **non-authoritative**; schema enum `AiSuggestionKind` and UI must treat output as draft.
- Configure **retention**, **model identity**, and **jurisdiction** (data residency) per tenant/policy before production use.
- Rate-limit and budget per tenant to control cost and abuse.

## Environment variables

Document each integration’s required env vars in deployment README or secret manager; validate presence in production via `apps/web/lib/env.ts` when variables are required for that deployment profile.
