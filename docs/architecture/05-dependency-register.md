# Dependency register

What has to exist before architecture decisions can be validated and before
implementation starts. Owner is always a named person/agent who can actually
unblock it.

Status vocabulary: `open` (nothing started), `in-progress`, `done`, `unknown`
(no reliable information about availability).

| ID | Dependency | Kind | Owner | Blocks | Status | Basis |
|---|---|---|---|---|---|---|
| DEP-01 | R0.1 source register: versions, licences, permissions and paid/free split for Paperclip, Medusa, Odoo, OpenSEO, JEV, Headroom/TKR and content apps | internal | Business Empire Orchestrator | INT-02, INT-12, INT-16, RISK-09; D0 | in-progress | plan §5 M0 R0.1; `docs/sources/registry.json` exists on `main` but not on `lavabean` |
| DEP-02 | R0.2 REA matrix for GoHighLevel (social, CRM, phone) and Lovable (visual generation, preview) | internal | Business Empire Orchestrator | INT-10, INT-14, INT-15; CRM route decision | open | BUS-20 (todo), plan §5 M0 R0.2 |
| DEP-03 | Human authorisation for accounts, credentials and any provider signup | human | Company owner (human) | DEP-05, DEP-06, DEP-09, DEP-10 | open | plan §7 `human_approval_required`; agent rules forbid inventing access |
| DEP-04 | Medusa instance with a pinned version and a sandbox environment | external | LavaBean Engineer | INT-02, INT-04; D1 | open | plan §5 M3; ASM-02 |
| DEP-05 | Payment provider sandbox account (no live card handling) | external | Company owner (human) | INT-05; D1 checkout-sandbox decision | open | plan §5 M3 R3.3, §9 D1 |
| DEP-06 | Supplier procurement authorisation: written confirmation that an order API may be used, plus sandbox credentials | external | Company owner (human) | INT-06, INT-08; D4 | open | plan §5 M4 R4.2, §7 supply-chain gate; ASM-01 |
| DEP-07 | Paperclip runtime pinned and running with per-role harness routing and write-back | platform | Business Empire Orchestrator | INT-01; all agent delivery | done | BUS-3, BUS-4, BUS-16 done via company API |
| DEP-08 | Repository access and PR gate enforcement on the integration branch (`lavabean`) | platform | Business Empire Orchestrator | INT-09; D6 release decision | in-progress | BUS-2 established checks on `main`; branch protection on `lavabean` unverified |
| DEP-09 | Odoo instance (edition, hosting, API surface) for journal and invoice mapping | external | Company owner (human) | INT-07; D4 finance decision | open | plan §5 M4 R4.3, §9 D4; ASM-03 |
| DEP-10 | Budget approval and hard caps for any paid provider call | human | Company owner (human) | INT-11, INT-13; RISK-03, RISK-07 | open | plan §1 AI preference, §7 `max_paid_spend_eur: 0` |
| DEP-11 | Brand DNA and design tokens (M2) before frontend integration can be judged | internal | LavaBean Engineer | INT-03; D2 | open | plan §5 M2 R2.1-R2.2; ASM-09 |
| DEP-12 | Choice of CRM product route (build on the commerce stack, or GoHighLevel via R0.2) | internal | Business Empire Orchestrator | INT-10, INT-14, INT-15 | unknown | plan §2 CRM extension, §5 M6; depends on DEP-02 |

## Critical path

DEP-02 and DEP-03 are the two dependencies that gate the most rows. DEP-03 is a
human decision and cannot be delegated to an agent; DEP-02 is tracked as BUS-20
and is still in `todo`, so the CRM, social and voice rows stay `unknown`.

DEP-01 is recorded as `in-progress` because a source registry exists on the
`main` baseline but has not been merged into `lavabean` and does not yet cover
every component the plan lists (Odoo edition, JEV, Headroom/TKR are unconfirmed).
