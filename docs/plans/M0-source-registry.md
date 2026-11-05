# M0 — Source registry, REA matrix and risk register (R0.1 / R0.2 / R0.3)

Status: draft — honest inventory. Proven / assumption / unknown per component.
Prepared 2026-10-26 by Business Empire Hermes (BUS-93 lane), after board "unblock"
(comment 55ef19d2-35f7-4d59-9773-a89df81b87c9) interpreted as the plan's
"expliciete starttoestemming" for M0 (master plan v1.1 line 266).

Per M0 acceptance: missing access is reported, not invented. Entries below use only
facts already verified in `docs/environment-assessment.md` (2026-10-21) plus
`docs/sources/registry.json`; everything else is marked assumption/unknown.

## R0.1 — Component registry

Legend: status ∈ {proven, assumption, unknown}. "proven" = verified on the authorized
Mac or from an inspected repo; "assumption" = general knowledge, not yet verified;
"unknown" = no information gathered.

| Component | Type | Version (observed) | License | Free/paid | Owner | Status |
|---|---|---|---|---|---|---|
| Paperclip | harness | commit 41c18aa443fe791fa67b27eef28fd7239f5e9d5d | MIT (root, verified) | free, self-hosted | Business Empire HQ (harness) | proven |
| OpenSEO | search | commit 89e5a00717cdf049b7c2b4e29646edb3a7d4995b | MIT (root, verified) | free, self-hosted | — | proven |
| LAVA-BEAN → calligentai/coffee | app repo | commit 3c46a24471cd4a20798867ac595f25c72f5b10f7 (96 status entries) | — | — | — | proven (repo present; license not yet classified) |
| opencode-token-reduction | tool | commit 343c880a6c34552b5a3940c27b1abbee03379766 | — | — | — | proven (repo present) |
| Medusa | commerce | unverified | open-source (assumption) | free self-host / paid cloud (assumption) | — | unknown |
| Odoo | ERP | unverified | LGPL Community / paid Enterprise (assumption) | mixed | — | unknown |
| Nuxt | frontend | unverified | MIT (assumption) | free | — | unknown |
| JEV | accounting | unverified | unknown | unknown | — | unknown |
| Headroom/TKR | time/productivity | unverified | unknown | unknown | — | unknown |
| GoHighLevel | social/CRM/phone | unverified | proprietary SaaS (assumption) | paid (assumption) | — | unknown |
| Lovable | visual generation/preview | unverified | proprietary SaaS (assumption) | paid (assumption) | — | unknown |

Verified toolchain (from environment-assessment.md): Git 2.54.0, GitHub CLI 2.96.0
(account calligentai), Node 26.11.1, pnpm 10.33.1, Python 3.15.0, Docker CLI 29.8.2
(daemon connection failed at /var/run/docker.sock), OCR 1.12.9.

Outstanding R0.1 gaps (reported, not invented):
- Upstream version/license/permission/free-paid classification for Medusa, Odoo, JEV,
  Headroom/TKR, GoHighLevel, Lovable, Nuxt — requires permitted public-source research
  and/or access to each vendor.
- Version pin conflicts: Paperclip pins pnpm 9.15.4; OpenSEO pins 10.30.1. Use isolated,
  compatible project runtimes per component.

## R0.2 — REA matrix (GoHighLevel, Lovable)

Not yet produced. Requires permitted public-source research (browser/documentation) per
`docs/rea/Hifany_LavaBean_REA_Codex_bijgewerkt.md`. No claim is made here about either
vendor's features, pricing, or integration surface until that research is done. Marked
unknown deliberately rather than guessed.

## R0.3 — Architecture, ADRs, risk & dependency register

No ADRs approved yet. Architecture decisions required from the board before M1+ can run.

Known risks / open dependencies (from environment-assessment.md "Outstanding"):
1. Medusa / Nuxt / Odoo: provider credentials, budgets and endpoint access unverified.
2. Brand assets, fonts, product media and usage rights unverified.
3. Docker daemon unreachable (CLI present, /var/run/docker.sock failed) — blocks any
   containerised smoke tests until fixed.
4. Technical-writer skill not found; plugin inventory incomplete.
5. No application install, startup or smoke test performed.
6. GitHub plan/quota and branch protection enforcement unverified.
7. pnpm version split across components (9.15.4 vs 10.30.1).

Ownership: P0-integration owners and feasibility-test assignments are not yet named;
this is the board's call and is a required input before M0 can be marked complete.

## Next actions (need board or external access)
1. Board names a P0 owner + one feasibility test per integration (M0 acceptance).
2. Provide or confirm access for Medusa/Odoo/GitHub org + brand assets.
3. Authorise the GoHighLevel/Lovable public-source REA research (R0.2).
4. Approve architecture ADRs for the critical path (M0 → M1 → … → M5).

No product-code Git mutation, external paid API call, or implementation was performed
for this draft; it is documentation only.
