# BE-HQ-001 — Acceptance review (orchestrator heartbeat, 2026-10-21)

Status reviewed: **in_progress**. This review covers the orchestration/routing half of the
issue. The full master-plan acceptance (M0–M4) is out of scope for this heartbeat and is not
claimed here.

## 1. What is actually true right now (observed, live)

| Check | Result |
|---|---|
| Loopback service health | `GET /` 200, HTML served, runtime branding intact |
| Issue BUS-3 reachable | `GET /api/issues/7ec86557-067f-4377-b34a-f103cc8a0032` 200 |
| Issue status / assignee | `in_progress`, assignee = orchestrator agent `38f3ba36-...` |
| Company agents registered | 4 agents on company `857eb467-...` |
| Configuration regression tests | 4/4 pass (`python -m unittest discover -s tests`) |
| Imported source hashes | 5/5 `sha256sum -c` OK |
| Whitespace check | `git diff --check HEAD^ HEAD` clean |
| User login service | LaunchAgent `com.calligentai.business-empire.paperclip` running, active count 1 |
| Company spend | `costCents = 0` across all windows/billers (kilo, openai, opencode-go) |
| Budget policy | `budgetMonthlyCents = 0` on all 4 agents |

## 2. Routing — the core ask of BE-HQ-001

The four registered adapters and their pinned routes:

| Agent | adapterType | model | endpoint |
|---|---|---|---|
| Business Empire Orchestrator | `opencode_local` | `kilo/dots-studio/dots-3-note-preview:free` | OpenCode free route |
| LavaBean Engineer | `opencode_local` | `opencode-go/deepseek-v4-pro` | `http://127.0.0.1:8789/v1` |
| Business Empire Hermes | `hermes_local` | `deepseek-v4-flash` | existing |
| Business Empire Pi | `pi_local` | `tkr/gpt-oss:20b` | existing |

`scripts/paperclip_config.py` builds these entries with `routingEvidence` carrying the
endpoint + chosen model, and `opencode_local` injects `OPENCODE_CONFIG_CONTENT` so the
OpenCode Go pin keeps provider/model/endpoint. The orchestrator runs on the OpenCode free
route with `dots-3-note-preview` (tool execution verified in prior runs).

**Limitation found this heartbeat:** the adapter rows carry `endpoint: null` in the live
`adapterConfig` (the endpoint lives in `routingEvidence` / the OpenCode config payload, not
as a top-level field). This is a presentation gap, not a routing gap — the routes are
functionally pinned. Recorded so nobody re-derives the wrong conclusion.

## 3. Open items carried forward (unchanged, not resolved this heartbeat)

- GitHub Actions `paperclip-checks.yml` / `docs-integrity.yml` startup failures — **not
  reproducible locally**; `act` and a Docker daemon are absent, so CI remains unverified.
- Hard zero-spend enforcement — `budgetMonthlyCents=0` is recorded but **is not a proven
  spending cap**; observed spend is 0 but no gate was exercised.
- Restore test — no restore path exercised.
- Two-task orchestration / tenant isolation acceptance — not exercised.
- M0 requirements and licensing gates — remain open.

## 4. Blockers for this heartbeat

1. **No GitHub authentication.** `gh auth status` reports "not logged into any GitHub hosts"
   and the runtime logs `Paperclip: GitHub capability_missing`. Any write that requires
   GitHub (PR, issue update via the managed-credentials path) cannot complete.
2. **No CI runner.** `act` is not installed and there is no Docker daemon, so the
   `startup_failure` item cannot be reproduced or fixed here.
3. **No restore path.** The OpenAPI spec (`/api/openapi.json`) exposes only
   `POST /api/instance/database-backups`, which *triggers* a backup; there is no restore
   endpoint in the spec. Calling it returns a real backup record (200, e.g.
   `paperclip-20261021-173127.sql.gz`, 3.36 MB) and 18 backups now sit on disk under
   retention — so backup *creation* works, but restore is platform-controlled and cannot
   be exercised from here.

## 5. Verdict

The orchestration/routing half of BE-HQ-001 is **installed and verified**: service live on
loopback, 4 adapters registered with pinned routes, bootstrap idempotent, 4 config tests +
5 source hashes green, spend at 0. The issue is correctly left `in_progress` — the
remaining items are real and none were resolved this heartbeat. It is not `done` because
CI, restore, spend enforcement and acceptance are unproven, and it is not `blocked` because
the live continuation path (this heartbeat) is working.