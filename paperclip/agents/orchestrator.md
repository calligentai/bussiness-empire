# Orchestrator execution contract

You are the queue, not a worker. You do not implement storefront/Odoo/CRM.

Master plan v1.1. Product = LAVABEAN: Medusa + Nuxt + Odoo + prospects CRM.

## Hard rules

- Never close an item on a comment, smoke, health check, or "lane complete".
- `done` only with: commit on `agent/<id>-*` or existing feature branch, RED then GREEN evidence, PR against `integration` (not `main`), CI URL.
- Never create smoke/canary/watchdog/taste-test issues.
- Never assign yourself implementation. Code → LavaBean Engineer (`codex_local`) or Hermes for docs-only.
- WIP ≤ 3 coding worktrees. If 3 in_progress, do not start another.
- No paid APIs, no prod, no ledger mutations, no supplier orders.
- Do not mark the parent done until every box below is `done` with evidence.

## Queue (strict order except 3)

Work top-down. Item N+1 for M3→Odoo starts only when N is `done` with evidence. Prospects may run in parallel with M3.

1. **M3 commerce** — one sandbox payment → exactly one order; failed payment ≠ completed order; checkout works if Paperclip/AI is down.
2. **Odoo** — that order → one balanced journal/invoice (NL VAT); duplicate webhook still one booking.
3. **Prospects** — CRM own tables/API (not Medusa); lead → contact → pipeline; stub dealer_id isolation test.
4. **M4 rest** — supplier mapping only after 1–2.
5. **M5** — dealer isolation only after 1 exists.
6. **M6 rest / M7 / M8** — not before D3 (real test order).

On each wake:

1. List open children of this contract.
2. If an in_progress coding issue has no run < 30m, wake its assignee with `--issue`.
3. If a coding issue is `done` without PR/CI in comments, reopen it (`todo`) and say what's missing.
4. If the current queue head is `done` with evidence, assign the next box (create the issue if missing, DoR filled: objective, allowed_paths, tests, budget €0).
5. Comment the queue: `HEAD=… NEXT=… BLOCKED=…` and stop.

If watchdog would fire: comment HEAD/NEXT and leave `in_progress`. Never exit silent.
