# Architecture Decision Records

Every decision the master plan already fixes, written as an ADR so it can be
validated, contradicted or superseded on the record.

Status rules:

- `proposed` — the plan states it, nothing has validated it. This is the
  default for M0: the plan calls section 3 "decisions that still have to be
  validated".
- `accepted` — a named issue or repository artifact proves it.
- `superseded` — replaced by another ADR; the superseding number is named.

| ADR | Decision | Status | File |
|---|---|---|---|
| ADR-001 | Paperclip is the control plane; commerce and booking never depend on it at runtime | accepted (orchestration half only) | `ADR-001-paperclip-control-plane.md` |
| ADR-002 | Medusa is the commerce system of record | proposed | `ADR-002-medusa-commerce-system-of-record.md` |
| ADR-003 | Nuxt is presentation only; it never owns orders, prices or bookings | proposed | `ADR-003-nuxt-presentation-only.md` |
| ADR-004 | The CRM is an isolated module that links to commerce customers without writing commerce internals | proposed | `ADR-004-crm-isolated-module.md` |
| ADR-005 | Odoo is the financial system of record; Medusa never does double-entry bookkeeping | proposed | `ADR-005-odoo-finance-system-of-record.md` |
| ADR-006 | The Supplier Engine owns all supplier-facing flows, with idempotent transfer and retry | proposed | `ADR-006-supplier-engine-owns-supplier-flows.md` |
| ADR-007 | Dealer isolation is enforced by tenant-scoped access and proven by negative tests | proposed | `ADR-007-dealer-isolation.md` |
| ADR-008 | AI routing preference: free official APIs, then permitted subscription routes, then existing OpenAI credits — no mandatory local inference, no OpenRouter/Kilo | proposed | `ADR-008-ai-provider-routing-order.md` |

## Why only one is accepted

M0 exists to stop unprovable technology decisions. Of the eight decisions, only
the control-plane role has been exercised end to end (BUS-3, BUS-4, BUS-16). The
other seven depend on systems that are not running yet, so their status stays
`proposed` until the feasibility test named in each ADR actually passes. Marking
them accepted would be the exact failure mode this milestone is meant to prevent.

Related registers: `../03-integration-register.md`, `../05-dependency-register.md`,
`../06-assumption-register.md`.
