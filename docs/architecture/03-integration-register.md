# Integration register

Every integration the platform depends on, with the owning Paperclip agent,
the dependency that blocks it, its dominant failure mode, its evidence status
and the feasibility test that would prove it.

Reading rules:

- `evidence_status` says what is *known*, not how important the row is.
- `test_status` says whether the feasibility test has actually run. `planned`
  means "written down, not executed"; `blocked` means the test cannot run yet.
- No endpoint path, payload shape or rate limit of an external provider is
  asserted anywhere in this register. Provider capability is `unknown` until
  its dependency resolves and a test passes. External request/response shapes
  are therefore unverified by design.

## Register

| ID | Integration | Boundary | Priority | Owner | Dependency | Failure mode | Evidence status | Feasibility test | Test status | Verification | Basis |
|---|---|---|---|---|---|---|---|---|---|---|---|
| INT-01 | Paperclip control plane ↔ engineer harnesses (issues, runs, approvals, write-back) | Control plane / agents | P0 | Business Empire Orchestrator | DEP-07 | A run silently leaves issue state untouched, so work looks done while nothing was delivered; or two harnesses write the same files | verified | Live-check issue: agent started, produced a commit, transitioned its own issue to done | passed | BUS-3, BUS-4, BUS-16 | plan §1, §2; BUS-3 done, BUS-4 done, BUS-16 done |
| INT-02 | Medusa commerce ↔ Nuxt storefront (catalog, cart, checkout, orders) | Commerce / presentation | P0 | LavaBean Engineer | DEP-04 | Exactly-once fails: a test payment creates zero or two orders, or catalog/price drifts from the authorised source | assumption | Sandbox order: one test payment produces exactly one order; replayed webhook produces no second order | planned | none | plan §2, §5 M3 R3.1-R3.4; ASM-02 |
| INT-03 | Nuxt storefront ↔ public web (SSR pages, SEO, sitemap) | Presentation / public | P0 | LavaBean Engineer | DEP-11 | Pages render with wrong brand tokens or stale catalog, so SEO and brand checks fail after launch | assumption | Render home and product template at desktop and mobile width and diff against approved brand tokens | planned | none | plan §5 M2 R2.3-R2.4; ASM-09 |
| INT-04 | Nuxt dealer sites ↔ tenant-scoped commerce data (sales-channel scoping) | Presentation / tenant | P0 | LavaBean Engineer | DEP-04 | Dealer A reads dealer B's customers, orders or SEO credentials; leak only visible in production | assumption | Negative test: dealer A session requests dealer B resources and is refused on every route | planned | none | plan §2, §5 M5 R5.1; ASM-11 |
| INT-05 | Payment sandbox ↔ Medusa checkout (authorise, capture, refund, webhooks) | Commerce / external provider | P0 | LavaBean Engineer | DEP-05 | Failed or cancelled payment still creates a fulfilment order, or a refund double-books against Odoo | unknown | Sandbox: authorised, declined, cancelled and refunded payment each produce exactly one correct order/credit state | blocked | none | plan §5 M3 R3.3-R3.4; DEP-05 |
| INT-06 | Supplier Engine ↔ authorised supplier procurement API (order transfer, tracking) | Commerce / supplier | P0 | LavaBean Engineer | DEP-06 | Order is retried after a timeout and the supplier ships twice; or goods ship with no tracked order | unknown | One idempotent order transfer into a supplier sandbox, then a forced timeout replay that must not duplicate | blocked | none | plan §5 M4 R4.2; ASM-01 |
| INT-07 | Medusa orders/invoices ↔ Odoo ledger (journal mapping, VAT, refunds, reconciliation) | Commerce / finance | P0 | LavaBean Engineer | DEP-09 | Medusa and Odoo disagree on revenue or VAT; correction requires manual journal surgery | unknown | Book one sandbox order and one refund in Odoo and reconcile to the Medusa order total to the cent | blocked | none | plan §5 M4 R4.3-R4.4; ASM-03 |
| INT-08 | Supplier Engine ↔ supplier catalog import (feed, SKU mapping, draft products) | Commerce / supplier | P0 | LavaBean Engineer | DEP-06 | Duplicate or mismatched SKUs create wrong products and wrong purchase orders | unknown | Import a supplier feed twice and prove SKU mapping stays unique and products stay in draft | blocked | none | plan §5 M4 R4.1; ASM-01, ASM-12 |
| INT-09 | Git repository ↔ CI and PR gates (branch per issue, required checks) | Delivery platform | P0 | Business Empire Orchestrator | DEP-08 | A change merges with failing or missing checks because the gate was never enforced on the target branch | assumption | Open a deliberately failing PR against the integration branch and confirm the check blocks the merge | planned | none | plan §5 M1 R1.3, §8A; BUS-2 on main baseline only |
| INT-10 | CRM extension ↔ Medusa customer records | Commerce / CRM | P1 | Business Empire Hermes | DEP-02 | Duplicate customer identities per dealer, or CRM writes corrupting commerce data | unknown | Link one lead to one commerce customer, then verify the same customer is not created twice on repeat import | blocked | none | plan §5 M6 R6.1; DEP-02 (BUS-20), ASM-06 |
| INT-11 | AI gateway ↔ model providers (free official APIs first, then permitted subscription routes, then OpenAI credits) | Shared service / provider | P1 | Business Empire Pi | DEP-10 | Core flows start depending on a provider that disappears or starts charging, or untracked spend appears | assumption | Route one request per approved provider and record endpoint, model and cost per call without secrets | planned | none | plan §1 AI preference, §2 AI gateway; ASM-08 |
| INT-12 | OpenSEO ↔ site audit and Search Console authorisation | Shared service / provider | P1 | Business Empire Hermes | DEP-01 | Free tier silently becomes paid, or dealer SEO credentials are shared across tenants | unknown | Run a free audit for one dealer with a hard zero budget and prove a second dealer cannot see the credentials | blocked | none | plan §5 M5 R5.3-R5.4; ASM-10 |
| INT-13 | Content Studio ↔ image/video providers, asset rights and brand review | Shared service / provider | P1 | Business Empire Codex | DEP-10 | Unlicensed assets or hallucinated product claims reach a public page | unknown | Generate one product asset and reject it through the rights and brand-review gate on a deliberately non-compliant variant | blocked | none | plan §5 M7 R7.1-R7.4 |
| INT-14 | Social connectors ↔ platform OAuth APIs (drafts, scheduling) | Shared service / provider | P1 | Business Empire Hermes | DEP-02 | Credentials leak into browser sessions, or a post publishes without approval | unknown | Connect one sandbox account, confirm token is stored server-side and a draft cannot publish without approval | blocked | none | plan §5 M6 R6.2; DEP-02 (BUS-20) |
| INT-15 | Voice/telephony ↔ carrier/provider with CRM call logging | Shared service / provider | P1 | Business Empire Pi | DEP-02 | Calls drop without fallback to a human, or call logs land outside the dealer's CRM scope | unknown | Place one test call, verify routing, CRM log and fallback to a named employee | blocked | none | plan §5 M6 R6.3; DEP-02 (BUS-20) |
| INT-16 | Advertising Intelligence ↔ public ad libraries | Shared service / provider | P2 | Business Empire Codex | DEP-01 | Scraping brittle public sources breaks silently or breaches terms | unknown | Retrieve one public ad reference from an allowed source and record its provenance | blocked | none | plan §5 M6 R6.4 |

## P0 set and why

P0 is the M1-M4 critical path from plan section 6: control plane, repository and
gates, storefront, commerce, payments, supplier transfer and Odoo booking. The
first product goal ("one complete test-order journey, demonstrable dealer
isolation, a working booking link") cannot be demonstrated without every P0 row.

| P0 concern | Covered by | Current proof |
|---|---|---|
| Agent orchestration and traceable delivery | INT-01, INT-09 | INT-01 verified by BUS-3/BUS-4/BUS-16; INT-09 unproven on the target branch |
| One reproducible purchase | INT-02, INT-05 | Not proven: both depend on instances and accounts that do not exist yet |
| Dealer isolation | INT-04 | Not proven: no negative test has run |
| Order to supplier | INT-06, INT-08 | Not proven: supplier authorisation missing (DEP-06) |
| Booking/finance link | INT-07 | Not proven: no Odoo instance (DEP-09) |

## Known gaps in this register

- No P0 feasibility test has been *executed* except the control-plane check.
  That is the honest state of M0: the plan's acceptance criterion ("every P0
  integration has an owner and at least one feasibility test") is met by this
  document only in the sense that tests are specified; they are not passed.
- D0 cannot be closed until DEP-01, DEP-02, DEP-05, DEP-06 and DEP-09 resolve.
- INT-09's gate evidence comes from the `main` baseline, not from this branch
  lineage; it is recorded as `assumption` deliberately.
