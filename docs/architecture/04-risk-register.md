# Risk register

Derived from master plan v1.1 section 8 plus the risks this architecture review
surfaced. Likelihood and impact are qualitative on purpose: there is no
production telemetry to quantify them yet.

| ID | Risk | Likelihood | Impact | Control | Owner | Basis |
|---|---|---|---|---|---|---|
| RISK-01 | Paperclip or a harness does not support a required capability natively (write-back, per-role routing, budgets) | medium | high | Proof-of-concept before depending on it; otherwise a thin adapter in a shared layer, never a fork of the control plane | Business Empire Orchestrator | plan §8 row 1; BUS-3, BUS-4 evidence |
| RISK-02 | Customer, order or SEO data leaks between dealers | medium | high | Tenant-scoped queries, an explicit authorisation matrix, and negative integration tests that must fail closed | LavaBean Engineer | plan §8 row 2; ASM-11 |
| RISK-03 | OpenSEO starts costing money unexpectedly (free tier removed, paid data pulled in) | medium | high | Free functions default, hard per-dealer limit, paid paths behind explicit opt-in and budget approval | Business Empire Hermes | plan §8 row 3; DEP-10, ASM-10 |
| RISK-04 | Medusa and Odoo disagree on revenue, VAT or order state | medium | high | One named system of record per fact, idempotent events, and a reconciliation check that runs before any release | LavaBean Engineer | plan §8 row 4; INT-07 |
| RISK-05 | Brand inconsistency across generated pages | high | medium | Design tokens, shared components, visual regression snapshots and an approval step for deviations | LavaBean Engineer | plan §8 row 5 |
| RISK-06 | AI produces incorrect product claims or quality scores | high | high | Source citation, mandatory human review, structured extraction before scoring, calibration against real engagement data | Business Empire Codex | plan §8 row 6 |
| RISK-07 | A provider or freemium endpoint disappears or changes terms | medium | medium | Feature flags, authorised fallbacks, and core purchase/booking paths that never depend on AI | Business Empire Pi | plan §8 row 7; ASM-08 |
| RISK-08 | Parallel harnesses cause merge conflicts or clobber each other's files | medium | medium | Strict one-worktree-per-issue ownership, contract-first changes, and no shared writes | Business Empire Orchestrator | plan §8 row 8 |
| RISK-09 | Licence errors from recycled repositories or assets | medium | high | Licence and SBOM check per component and asset before adoption; R0.1 source register as the gate | Business Empire Orchestrator | plan §8 row 9; DEP-01 |
| RISK-10 | Documentation claims capability the platform does not have (this register itself drifting) | medium | medium | Mechanical validation of this directory on every change; `verified` requires an existing artifact or a named issue | Business Empire Hermes | this task; scripts/validate_architecture_docs.py |
| RISK-11 | A failed or duplicated payment creates a wrong order or a double refund | medium | high | Sandbox-only testing until proven, idempotency keys on payment events, replay tests for duplicate webhooks | LavaBean Engineer | INT-05, plan §5 M3 R3.4 |
| RISK-12 | Supplier order duplicated after a timeout, or shipped without authorisation | medium | high | Idempotent transfer keyed on order line, reconciliation against supplier acknowledgements, manual hold on unacknowledged orders | LavaBean Engineer | INT-06, plan §5 M4 R4.2 |
| RISK-13 | D0 is closed on schedule pressure while P0 feasibility tests are still blocked | medium | high | D0 sign-off requires either a passed test or a named unblock owner per P0 row; a blocked row is reported, never assumed | Business Empire Orchestrator | plan §9 D0, §5 M0 acceptance |
| RISK-14 | Secrets or customer data enter git history or agent transcripts | low | critical | No credentials in branches or comments; environment variables only; secret scanning in the final diff review | Business Empire Orchestrator | plan §4.3 DoD item 1; agent rules |

## Escalation

A risk becomes a blocker when its control cannot be exercised with current
access. When that happens the owning issue is marked `blocked` with the named
unblock owner from `05-dependency-register.md`, and the corresponding
integration row is flipped from `assumption` to `unknown` rather than left
looking healthy.
