# GitHub #43 ↔ LavaBean frontend gap map (BUS-133)

Verified against the merged lavabean branch at `d17c90f`
(worktree `feature/BUS-133-verify-lavabean-hq-dealer-ux-and-github-43-gap-map`).
Every claim below was confirmed by listing code or running tests; nothing is
inferred from task descriptions alone.

## What exists (verified)

### Store (M1 Commerce)
- Pages: `pages/index.vue`, `pages/product/[slug].vue`, `pages/checkout.vue`,
  `pages/order/[id].vue`; `components/` has `ProductCard`, `LavaButton`,
  `BrandMark`; `composables/useCart.ts`.
- Dealer tenant isolation is enforced at contract level
  (`packages/contracts/dealer`, `packages/contracts/auth`), with passing
  regression suites: `tests/dealer/*` and `tests/security/*` — 21 tests, all
  green, including two-dealer checkout→dashboard isolation.

### Backend apps
- `apps/odoo-sync` and `apps/supplier-engine` (non-UI) with contract tests in
  `tests/odoo`, `tests/supplier`.

### Contracts with test coverage but no UI
- OpenSEO: `packages/contracts/openseo` (free audit, dealer-scoped dashboard,
  Search Console authorization gate), `tests/openseo/*` + seo budget tests.
- CRM: `composables/useCrm.ts` + `tests/crm/prospects.test.ts` (dealer-scoped
  prospect pipeline primitives).
- Analysis/creative: `server/analysis/video-analyzer.ts`, `types/media.ts`,
  `types/jev.ts` (source-side only).

### Visible dealer demo — NOT merged
- PR #29 (`pages/dealer/index.vue` + e2e) and PR #34
  (`pages/dealer/ad-library.vue`, `components/AdLibraryDashboard.vue`) are
  still OPEN. The HEAD has zero `public/`-facing HQ or dealer backoffice
  pages; grep for dealer/admin/SEO/CRM/supplier UI files returns only the
  contracts listed above.

## Gaps (verified missing from HEAD, per GitHub #43 area)

1. **Commerce/MedusaJS** — no HQ catalog/product management UI, no webshop
   management screens, no dealer shop dashboard in HEAD (demo is unmerged).
   Contract layer already dealer-isolated.
2. **ERP/Odoo/Supply** — no sourcing, purchasing, inventory or margin UI at
   all (backend widgets only). Known pre-existing test failure:
   `tests/odoo/journal.test.ts` pricing fixture drift (also at clean HEAD,
   unrelated to frontend).
3. **CMS/Creative Studio/OpenSEO** — no CMS page editor, no media library,
   no AI image/video creation UI (only server-side analyzers), no OpenSEO
   dashboard UI (contracts + tests only; PR #34 ships an ad-library page,
   not the SEO dashboard).
4. **CRM/Growth** — no HQ or dealer CRM/prospecting UI; composable + tests
   only.
5. **Platform/AI/Security** — isolation verified by tests, but no UI for
   RBAC, approvals, audit logs, or AI agent budgets. New shared issues #44
   (Creative Studio), #45 (CRM), #46 (agent budgets) already cover 3, 4 and
   5 partially.

## Smoke evidence (this run, 2026-11-04)

Command: `pnpm install --frozen-lockfile` then, at HEAD `d17c90f`:

- `pnpm tokens:build` → wrote `assets/css/tokens.css` OK.
- `pnpm brand:check` → “Brand check passed (9 files, 0 deviations).”
- `pnpm test` (vitest) → **102/103 passed**; sole failure
  `tests/odoo/journal.test.ts` pricing-fixture drift (13 netCents / 94
  vatCents deltas), pre-existing at clean HEAD, non-UI.
- `vitest run tests/dealer tests/security` → 21/21 pass.
- `vitest run tests/crm tests/openseo tests/dealer/{seo-budget,brand-versioning}.test.ts` → 16/16 pass.

## Minimal independent PR proposed

One branch, one commit: this gap-map document only (no code changes), so
review is a zero-risk doc merge. Feature work should flow through the two
approval-gated PRs (#29, #34) plus issues #44–#46 rather than starting brand
new tracks.
