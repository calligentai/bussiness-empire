# System boundaries

Scope: LAVABEAN-PLATFORM, the first venture. Everything below is derived from
master plan v1.1 section 2 ("Scope en systeemverantwoordelijkheden") and
section 5 (milestones M1-M8). No provider capability is asserted here.

## Diagram

Control plane on top, commerce spine in the middle, external parties at the
edges. Arrows are allowed data flows, not implemented integrations.

```
                       ┌──────────────────────────────────────────┐
                       │  Paperclip control plane (HQ)            │
                       │  portfolio · issues · approvals · runs   │
                       │  Kanban · agent allocation · budgets     │
                       └───┬───────────┬───────────┬──────────────┘
             dispatches    │           │           │  evidence only
             work + gates   │           │           │  (never order data)
                           ▼           ▼           ▼
                 ┌──────────────┐  ┌─────────┐  ┌──────────────────┐
                 │ Engineer     │  │ Review  │  │ Shared services  │
                 │ harnesses    │  │ /gates  │  │ AI gateway       │
                 │ (Codex/Pi/   │  │         │  │ Content Studio   │
                 │  Hermes)     │  │         │  │ OpenSEO          │
                 └──────┬───────┘  └─────────┘  │ Voice / Social   │
                        │ writes code/docs      │ Ad Intelligence  │
                        ▼                       └───┬──────────────┘
        ┌───────────────────────────────────┐       │ provider calls
        │ Git repo + CI (GitHub)            │       ▼
        │ branch per issue · PR gates       │   ┌────────────────────┐
        └───────────────┬───────────────────┘   │ External providers │
                        │ deploys (not yet)     │ (models, SEO, ads, │
                        ▼                       │ social, telephony) │
   ┌────────────────────────────────────┐       └────────────────────┘
   │ Nuxt storefront + dealer sites     │
   │ presentation, SEO pages, brand     │
   └───────┬──────────────────┬─────────┘
           │ cart/checkout    │ dealer-scoped reads
           ▼                  ▼
   ┌────────────────────────────────────┐        ┌──────────────────┐
   │ Medusa commerce                    │◄──────►│ CRM extension    │
   │ catalog · cart · orders · customers│        │ leads · pipeline │
   │ fulfilment · sales channels        │        │ customer context │
   └───┬──────────────────────┬─────────┘        └──────────────────┘
       │ order/invoice events │ supplier orders
       ▼                      ▼
┌──────────────┐      ┌────────────────────────────┐
│ Odoo finance │      │ Supplier Engine            │
│ ledger · VAT │      │ import · mapping · orders  │
│ invoices     │      │ tracking · retry           │
└──────────────┘      └─────────────┬──────────────┘
                                    │ authorised procurement API
                                    ▼
                          ┌────────────────────┐
                          │ Suppliers          │
                          │ Hifany (core)      │
                          │ AliExpress (opt.)  │
                          └────────────────────┘
```

## Authority boundaries

| System | Owns (system of record) | Must not | Evidence status |
|---|---|---|---|
| Paperclip control plane | Portfolio, agent organisation, Kanban, issue state, approvals, run budget | Process orders, authorise payments, hold the financial ledger; be a runtime dependency of checkout | `verified` for orchestration (BUS-3, BUS-4); runtime independence is an assumption (ASM-05) |
| Nuxt storefront + dealer sites | Presentation, SEO pages, brand compliance | Be authoritative for orders, prices or bookings | `assumption` — no frontend exists yet |
| Medusa | Catalog, cart, checkout, orders, commerce customer IDs, fulfilment, sales channels | Double-entry bookkeeping, VAT filing | `assumption` — version and licence not yet registered (DEP-01) |
| CRM extension | Leads, contacts, pipeline, interactions, dealer-specific customer context | Direct writes into Medusa internals | `unknown` — CRM product route unresolved pending BUS-20 (DEP-02) |
| Odoo | General ledger, VAT, financial invoices, reconciliation, accounting | Manage frontends or AI | `unknown` — edition, hosting and API surface unconfirmed (DEP-09) |
| Supplier Engine | Product import, SKU mapping, supplier orders, tracking, retry/idempotency | Sell without an authorised procurement API | `assumption` — supplier API access unproven (DEP-06) |
| Shared services (OpenSEO, Content Studio, Voice, Social, Advertising Intelligence, AI gateway) | Per-venture/per-dealer function within tenant and role limits | Unapproved paid calls, unlicensed platform accounts, production publishing | `unknown` for every provider route below |

## Trust boundaries (what may cross which line)

| Boundary | Allowed | Forbidden |
|---|---|---|
| Control plane → repository | Issue-driven branches, PRs, review gates, evidence links | Agent pushes to `main` or `lavabean`, force-push, secret material |
| Control plane → commerce runtime | Nothing at runtime | Checkout or booking depending on Paperclip being up (ASM-05) |
| Storefront → Medusa | Cart and checkout calls, catalog reads | Writing orders directly, reading another dealer's data |
| Medusa → Odoo | Order/invoice events with idempotency keys | Medusa acting as ledger; Odoo writing into catalog |
| CRM → Medusa | Customer linking through Medusa's own commerce interface | Direct database or internal-model writes |
| Shared services → providers | Calls under the plan's provider order (ADR-008) with hard caps | Unapproved paid calls, credentials in the browser, unlicensed accounts |
| Dealer ↔ dealer | Nothing | Any cross-dealer read of customers, orders, SEO credentials or assets (ADR-007) |

## Deployment reality today

No application exists. This branch contains documentation plus a documentation
checker only. CI on this branch lineage is unverified: the workflows that exist
are on the `main` baseline (BUS-2), and this branch is cut from `lavabean`.
Treat every "runs in CI" statement as `assumption` until the workflow files are
present on the branch that actually builds the platform.

## What must be true before implementation starts

1. D0 research decision: ADRs in `02-adrs/` reviewed, licences known (DEP-01),
   P0 contracts agreed.
2. Every P0 row in `03-integration-register.md` has a feasibility test that has
   actually run and passed, or a named blocker with an unblock owner.
3. Branch and worktree discipline is in force: one feature branch and worktree
   per issue, PR target `lavabean`, no direct writes to `main` or `lavabean`.
