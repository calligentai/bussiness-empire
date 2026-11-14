# Plan vs code audit

**Plan:** `docs/plans/BUSINESS_EMPIRE_Master_Execution_Plan_v1.1_TDD_Production.md` (v1.1, 20 October 2026).
**Tree audited:** `deploy/imacserver-staging-20261103` at `30962b7`, plus PR #49 (`e1001f3`, DRI Rwanda), plus the file-backed sandbox in PR #51.
**This change** replaces that file order store with Medusa 2.22.7 and Postgres. A requirement is (a) only when a test exercises it against the running server.

Classes:

- **(a)** implemented and wired end to end. A shopper, operator, or test can exercise the requirement against the running server, and a test shows the outcome.
- **(b)** present as code, a contract, a fixture, or a UI shell. Labels, mock data, in-memory functions, and screens that do not call a working backend stay here.
- **(c)** missing from this branch.

`origin/lavabean` has a few later commits that are not in this deployment branch. They are named where they matter. They are not counted as present.

## Counts

| | (a) | (b) | (c) | Total |
|---|---:|---:|---:|---:|
| Before the file sandbox (staging at `e1001f3`) | 3 | 16 | 16 | 35 |
| After the file sandbox (PR #51) | 5 | 14 | 16 | 35 |
| After this change (Medusa) | 7 | 12 | 16 | 35 |

The three requirements that were already (a) before any checkout work are the Lava Bean brand DNA, the tokenised components, and the Nuxt home/product templates (R2.1–R2.3). PR #51 moved R3.2 and R3.3 to (a) for a file-backed manual order. This change moves R3.1 and R3.4 to (a). Catalog, cart completion, capture, order status, refunds, and duplicate webhooks run against Medusa 2.22.7 and Postgres. Stripe and Mollie stay unwired.

## Milestone reading

| Milestone | Before | After | Largest hole |
|---|---|---|---|
| M0 Sources and feasibility | Not met | Not met | No current source register, no GoHighLevel/Lovable matrix, no ADR set |
| M1 Paperclip, git, CI | Not met | Not met | Paperclip is not on this branch. The only hook checks document hashes |
| M2 Brand | Mostly met | Mostly met | Home visual snapshots were removed. Storybook is not what staging serves |
| M3 Commerce | Not met | Met for the manual sandbox against Medusa | Stripe and Mollie are still refused. No VAT. The browser basket is not a live Medusa cart until Pay now |
| M4 Supplier and Odoo | Not met | Not met | Mapping and journal math exist in memory. Nothing transmits an order or books a ledger |
| M5 Dealers and OpenSEO | Not met | Not met | Contracts and tests only. `/dealer` is a labeled fiction. `/seo` is 404 |
| M6 CRM and growth | Not met | Not met | In-memory leads only. `/crm` is 404. No phone, social, or ad route on this branch |
| M7 Content and JEV | Not met | Not met | Analyzer and scorer are libraries. No provider and no persona proof |
| M8 Repair and rollout | Not met | Not met | A storefront container exists. The plan's demo (two dealers, SEO, supplier, Odoo, content) does not |

## Requirements

### M0

**R0.1 Source register. (b) → (b).**
`docs/environment-assessment.md` (`d354acc`, PR #15) and `docs/sources/registry.json` (PR #1) exist. The assessment still says Medusa and Nuxt are not installed and that the M4 baseline is Next.js. This repository is a Nuxt app. The register is not a current licence and access record for Paperclip, Medusa, Odoo, OpenSEO, JEV, Headroom, or the content apps.

**R0.2 REA matrix for GoHighLevel and Lovable. (c) → (c).**
PR #8 is open and is not in this tree. `docs/rea/Hifany_LavaBean_REA_Codex_bijgewerkt.md` is a research-method note. It is not the required matrix with proven / assumed / unknown rows.

**R0.3 Architecture diagram, ADRs, risk and dependency register. (c) → (c).**
PR #7 is open. There is no `docs/architecture/`. The ADRs in the plan are explicitly "still to be validated".

### M1

**R1.1 Paperclip org `Business Empire HQ`, project `LAVABEAN-PLATFORM`, roles. (c) → (c).**
No Paperclip config is on this branch. PR #4 is open. PR #5 landed on `feature/paperclip-orchestrator`, which is not an ancestor of this branch.

**R1.2 Two harnesses, two worktrees, no shared writes. (c) → (c).**
`docs/workflow.md` describes the branch policy. Nothing in this tree connects Codex and a second harness to separate issues.

**R1.3 PR gates, branch protection, CI, cost limits, failure handling. (b) → (b).**
`verify.sh` (`26ae2c9`) and `.githooks/pre-commit` / `pre-push` check `docs/sources/SHA256SUMS` only. `README.md` calls that script the whole CI. It does not run lint, unit tests, Playwright, or a secret scan. There is no `.github/workflows` directory. Cost limits are not implemented.

**R1.4 Kanban with real gate progress, previews, and issues. (c) → (c).**
No board or gate-progress model is in the repository.

### M2

**R2.1 Lava Bean Brand DNA. (a) → (a).**
`docs/brand/brand-dna.md` and `brand/tokens.json` (`3433179`, PRs #9 and #11). The storefront renders those tokens. `tests/brand-rules.test.ts` covers the rules.

**R2.2 Tokens, components, Storybook examples, accessibility checks. (a) → (a).**
`brand/tokens.json`, `components/LavaButton.vue`, `components/ProductCard.vue`, `stories/*.ts`, `.storybook/`, `tests/e2e/a11y.spec.ts`, `scripts/check-brand.mjs`. This session ran the brand check (15 files, 0 deviations) and the Playwright accessibility tests, including the new cart and checkout routes. `pnpm build-storybook` was not run in this session. The stories are in the tree and the components are what staging renders.

**R2.3 Nuxt home and product templates, desktop and mobile. (a) → (a).**
`pages/index.vue`, `pages/product/[slug].vue`. DRI Rwanda was added in `e1001f3` (PR #49) without removing Virunga, Kivu, or Basalt. `tests/e2e/home.spec.ts` and `tests/e2e/product.spec.ts` pass on desktop and mobile against the production build.

**R2.4 Playwright visual snapshots and the central brand-rule check. (b) → (b).**
`tests/brand-rules.test.ts` and `tests/e2e/brand-rules.spec.ts` fail a deliberately wrong spacing or colour rule. That part is real. Home snapshots were deleted in `e1001f3`. Product and dealer snapshots on this branch were macOS files; this change adds Linux baselines because that is where the suite was run. `verify.sh` does not run them. A wrong colour on the staging host is not blocked by the deploy hook.

### M3

**R3.1 Medusa product, catalog, and price contracts. (b) → (a).**
Before: `data/medusa-catalog.ts` was the price list inside the Nuxt process. There was no Medusa server.
After: `apps/medusa` is Medusa 2.22.7. `src/scripts/seed.ts` loads `src/data/catalog.json`, which `tests/medusa-seed-catalog.test.ts` checks against the same four products, DRI sizes, prices, and `/products/dri-rwanda-specialty-arabica.jpg`. Postgres holds the products. `GET /store/products` returns DRI 500 g at €16.96 with that photo. `tests/commerce-medusa.test.ts` calls that route. The storefront `GET /api/catalog` reads the Store API, and the home and product pages render it. The TypeScript catalog remains the seed input, not the runtime price list.

**R3.2 Product detail, cart, and checkout in Nuxt. (b) → (a).**
Before: `pages/product/[slug].vue` could push a line into a module-level Vue ref (`composables/useCart.ts`). `pages/checkout.vue` rendered an empty Pay now form. There was no `/cart` route.
After PR #51: `/cart`, a header cart drawer, and checkout stored the basket in `localStorage` under `lavabean.cart.v1`.
After this change: product pages load prices from Medusa through `GET /api/catalog`. Pay now posts to `POST /api/checkout`, which calls `POST /store/lavabean/checkout`. That route creates a Medusa cart, adds the variant, sets the address, adds the zero-cost shipping option, and completes the cart. The drawer is still the browser basket until that click. `tests/e2e/checkout.spec.ts` adds DRI 500 g, sets quantity 2, checks €33.92, pays, and reloads the order. Desktop and mobile both passed against the built storefront with Medusa on port 9000.

**R3.3 Payment sandbox and order status. (b) → (a) for the manual provider only.**
Before: `processPayment` in `composables/useCart.ts` waited 10 ms and returned a fake id.
After PR #51: a Nitro module wrote a JSON order file.
After this change: checkout uses Medusa's system provider `pp_system_default`, then `capturePaymentWorkflow`. A paid test creates one Medusa order (`order_…`) and a shopper number `LB-` plus a counter, status `paid`. A declined outcome is a checkout record with `medusaOrderId: null` and does not add an order row. `GET /api/orders/:id` reads it back from Medusa. `tests/commerce-medusa.test.ts` asserts one order for the paid DRI case and zero orders for the decline. The Playwright test asserts `paid`, 3392 cents, SKU `DRI-RW-500G`, and quantity 2, then reloads.
Stripe and Mollie are not called. `sk_live_`, `rk_live_`, and Mollie `live_` keys are refused. `PAYMENT_PROVIDER=stripe` or `mollie` returns 501. `APP_ENV=production` refuses checkout. See `deploy/staging/COMMERCE.md`.

**R3.4 Refund, error, and duplicate-webhook tests. (b) → (a).**
Before: `tests/commerce-r34.test.ts` drove `useOrders` in the Vue composable. Checkout did not call it.
After: `POST /admin/lavabean/orders/:id/refund` runs Medusa `refundPaymentWorkflow`. A second refund returns `already_refunded`. A failed checkout returns `not_refundable`. An unknown id returns `order_not_found`. `POST /hooks/lavabean/payment` records an event id once and returns `applied: false` on the repeat. A later paid event after a refund returns `already_refunded` and leaves the status refunded. `tests/commerce-medusa.test.ts` checks the Medusa payment status is `refunded`. Empty carts, bad customers, and a missing DRI size still fail in `tests/commerce-checkout.test.ts`. The Vue composable is still imported by the dealer unit tests. It is not on the shopper path.

### M4

**R4.1 Supplier SKU mapping, concept import, permission checks. (b) → (b).**
`apps/supplier-engine/src/mapping.ts` (`77d6cd6`, PR #18) and `tests/supplier/mapping.test.ts`. One-to-one mapping and a concept record, held in the arguments of the function. No import pipeline and no catalog write.

**R4.2 Authorised supplier API, idempotent order handoff, tracking. (c) → (c).**
No adapter sends an order. No tracking status is stored.

**R4.3 Odoo journal / invoice mapping, VAT, refunds. (b) → (b).**
`apps/odoo-sync/journal.ts` (`75f2390`, PR #17) and `tests/odoo/journal.test.ts`. A paid event can be mapped to a balanced 21% draft and a refund to a credit note, through an injected client. Checkout does not call it. Odoo is not running.

**R4.4 Reconciliation and recovery when supplier or Odoo is offline. (c) → (c).**
Not on this branch. `origin/lavabean` has `apps/reconciliation/reconcile.ts` from PR #38 (`bcf0b07`). That code uses injected transports and does not call a live supplier or Odoo. It is still absent from the staging tree.

### M5

**R5.1 Dealer identity, domain, role, scoped customer and order data. (b) → (b).**
`packages/contracts/dealer/index.ts`, `packages/contracts/auth`, `tests/dealer/isolation.test.ts`, `tests/security/dealer-tenant-isolation-regression.test.ts`, `tests/dealer/checkout-dashboard-isolation.test.ts` (PRs #21 and #30). The tests pass dealer ids into the in-memory order composable. There is no login session. `pages/dealer/index.vue` (`6f80068`) says "Demo data · fictional sample account" and renders hardcoded rows, including a Nyungwe lot that is not in the catalog.

**R5.2 Dealer brand overrides and central template versions. (b) → (b).**
`tests/dealer/brand-versioning.test.ts` (`5d7feb2`, PR #22). The storefront does not load a per-dealer token set.

**R5.3 OpenSEO base dashboard. (b) → (b).**
`packages/contracts/openseo/index.ts` (`71fa7fe`, PR #23) and `tests/openseo/dashboard.test.ts`. Pure functions for metadata, sitemap, and a zero-cost audit. No `/seo` page, no sitemap route, no Search Console client.

**R5.4 Per-dealer DataForSEO budget, approval, hard cap, invoice link. (b) → (b).**
`tests/dealer/seo-budget.test.ts` (`554d4e5`, PR #25). The contract fails closed and does not dispatch a paid call. There is no DataForSEO client and no invoice link. The design restoration PR #24 is open and not in this tree.

### M6

**R6.1 CRM contacts, leads, pipeline, and a Medusa customer link. (b) → (b).**
`composables/useCrm.ts` (`d059f39`, PR #19) and `tests/crm/prospects.test.ts`. Leads live in a Vue ref. Nothing stores a Medusa customer id. `/crm` is 404.

**R6.2 Social setup, OAuth, drafts, scheduler. (c) → (c).**
Not on this branch. PR #36 on `origin/lavabean` adds disconnected fixtures and says so. No OAuth connector exists there either.

**R6.3 Phone setup, routing, test call, CRM log, human fallback. (c) → (c).**
No phone module.

**R6.4 Ad intelligence on public ad libraries. (c) → (c).**
Not on this branch. PR #34 on `origin/lavabean` adds `pages/dealer/ad-library.vue` as a local fixture dashboard. It is not a live library client, and it is not deployed from this branch.

### M7

**R7.1 One provider-neutral media interface. (c) → (c).**
PR #10 is open and says it does not claim the milestone. No media interface is in this tree.

**R7.2 Image provider inside a credit cap; video only with an approved budget. (c) → (c).**
No image or video provider client.

**R7.3 Video analyzer, visual/SEO facts, JEV score. (b) → (b).**
`server/analysis/video-analyzer.ts`, `server/analysis/facts.ts`, `server/jev/scoring.ts` (`563a601`, PR #12), with `tests/analysis/*.test.ts` and `tests/jev/scoring.test.ts`. Nothing routes a request to them.

**R7.4 Buyer-persona trial against real watch-time, scroll-stop, CTR, and conversion. (c) → (c).**
No persona harness and no measurement feed.

### M8

**R8.1 Incident to issue, triage, bounded escalation. (c) → (c).**
`949a6d1` is on `origin/feature/BUS-110-incident-triage` and is not an ancestor of this branch. PR #26 is open.

**R8.2 Codex fix in a worktree, regression test, independent review. (c) → (c).**
PR #27 is open. No repair harness is in this tree.

**R8.3 Controlled staging release, rollback, incident log. (b) → (b).**
`deploy/staging/compose.yaml` and `deploy/staging/README.md` (`da3bc83`, PR #42) describe the 18081 Coolify service. The 18082 service is documented beside it. Rollback is "put the previous Compose back". There is no incident log and no tested restore of orders. PR #33's runbook is on `origin/lavabean` only. This change adds a volume for order files; it does not add a backup drill.

**R8.4 Demo: one shop, two dealer sites, SEO dashboard, supplier order, Odoo booking, optional content. (c) → (c).**
Staging shows one shop and one fictional dealer page. The rest of the demo is absent.

## Claims the code does not support

- **PR #13** (closed, not merged) described cart lines in `localStorage` (`lavabean.cart.v1`) and persisted orders. A search of the tree at the PR #16 merge (`3791b94`) and at `30962b7` finds no `localStorage`. The merged checkout could not survive a reload.
- **PR #16** reports the M3 acceptance as met from `pnpm test` (unit tests on the in-memory composable). Those tests never open a browser, never require `/cart`, and never collect a customer. The live staging page was an empty Pay now form. That is a real unit suite and not a completed purchase.
- **PR #42** is accurate that the service is a storefront plus a fictional dealer demo and that no real payment is attached. Calling the empty form a sandbox checkout overstates what a visitor could do. Browser checks reported there do not include placing an order.
- **PR #47** is a docs-only gap map. The generated summary in that PR body says the PR added a shopping cart, checkout, and order confirmation. The diff is a markdown file on `lavabean`, and it is not on this branch.
- **`README.md`** says `./verify.sh` is the whole CI. The script only runs `sha256sum -c docs/sources/SHA256SUMS`.
- **`docs/environment-assessment.md`** says Nuxt and Medusa are not in use. This branch is Nuxt, and Medusa 2.22.7 runs as `apps/medusa`. The assessment is not the current inventory.
- **`pages/dealer/index.vue`** is labeled as fiction. Dealer, SEO, CRM, and isolation PRs that talk about dashboards are describing contracts or this sample page, not a logged-in dealer.
- **PRs #34, #36, and #38** describe later `lavabean` work (ad fixture, disconnected social fixtures, in-memory reconciliation). They are not in the staging revision the iMac is running, and the first two are fixtures even on `lavabean`.

## Routes observed on the old staging build

| Path | Before | After |
|---|---|---|
| `/` | Branded storefront | Same, with a cart control |
| `/product/…` | Product page. DRI is on PR #49 | Same, plus size choice and add to cart |
| `/cart` | 404 | Cart with quantities and total |
| `/checkout` | Empty Pay now form | Customer, shipping, manual pay |
| `/order/LB-…` | 404 or "not found" after reload | Confirmation and status from the Medusa order |
| `/dealer` | Fictional demo | Unchanged |
| `/seo`, `/crm`, `/admin`, `/account` | 404 | Still 404 |

## What this change does not finish

Stripe test and Mollie test still return 501. There is no shopper refund button; refunds are the Medusa admin route. The browser cart is not a Medusa cart until Pay now. Shipping is €0 and tax is off, so the total stays the catalog total; VAT is M4. Redis is not running. Medusa logs that its local event bus is not what it recommends for more than one process. This compose runs one Medusa process, and completed orders are in Postgres. The old `useOrders` composable remains for dealer unit tests. Supplier, Odoo, CRM, SEO, phone, social, ads, Paperclip, and the M8 demo are untouched. A Postgres restore drill was not run. This environment did not deploy to the iMac.
