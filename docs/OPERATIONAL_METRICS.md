# Operational metrics

Kernel-style metrics (e.g. “99.9% uptime testbed”) do not apply to this product. Use **observable**, **deployment-specific** measures.

## Suggested SLOs (adjust per hosting)

| Area | Example metric | Notes |
|------|----------------|--------|
| API | p95 latency for dashboard and critical Route Handlers | Exclude static assets |
| Errors | 5xx rate on `/api/*` | Alert on spikes |
| Auth | Login failure rate | Detect brute force or misconfiguration |
| Payouts | Batches stuck in `PROCESSING`; item `FAILED` rate | Money path |
| Messaging | Outbound failure rate; webhook processing lag | Provider health |
| Integrity | Open cases age; time to resolve | Operational workload |

## Logging

- Prefer **structured logs** (JSON) in production.
- Include **request id** / correlation id where possible (middleware or headers).
- Do not log secrets, full tokens, or unnecessary PII.

## Incidents

- Define **on-call** / owner and **rollback** steps (schema migration + app version).
- Post-incident: update runbooks and tests for the failure mode.
