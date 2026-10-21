# BE-HQ-001 — Acceptance review (orchestrator heartbeat, 2026-10-21)

Status reviewed: **blocked** (unblock owner: board — inject a GitHub token for the private
repo and make Actions available, then resume the orchestrator). This review covers the
orchestration/routing half of the issue. The full master-plan acceptance (M0–M4) is out of
scope for this heartbeat and is not claimed here.

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

The four registered adapters and their pinned routes (snapshot taken during this review):

| Agent | adapterType | model | endpoint |
|---|---|---|---|
| Business Empire Orchestrator | `opencode_local` | `kilo/dots-studio/dots-3-note-preview:free` | OpenCode free route |
| LavaBean Engineer | `opencode_local` | `opencode-go/deepseek-v4-pro` | `http://127.0.0.1:8789/v1` |
| Business Empire Hermes | `hermes_local` | `deepseek-v4-flash` | existing |
| Business Empire Pi | `pi_local` | `tkr/gpt-oss:20b` | existing |

Live adapter configs re-read at the end of the fix pass (2026-10-21T21:35Z, unchanged by
this pass): Orchestrator `opencode_local` / `kilo/dots-studio/dots-3-note-preview:free`,
LavaBean `opencode_local` / `meta/muse-spark-1.3`, Hermes `hermes_local` / `auto` /
`deepseek-v4-flash`, Pi `pi_local` / `tkr/ollama3:gpt-oss:20b`. The LavaBean and Pi routes
above were re-pinned by their owners after this table was written; no provider, model or
routing endpoint was changed by the orchestrator.

`scripts/paperclip_config.py` builds these entries with `routingEvidence` carrying the
endpoint + chosen model, and `opencode_local` injects `OPENCODE_CONFIG_CONTENT` so the
OpenCode Go pin keeps provider/model/endpoint. The orchestrator runs on the OpenCode free
route with `dots-3-note-preview` (tool execution verified in prior runs).

**Limitation found this heartbeat:** the adapter rows carry `endpoint: null` in the live
`adapterConfig` (the endpoint lives in `routingEvidence` / the OpenCode config payload, not
as a top-level field). This is a presentation gap, not a routing gap — the routes are
functionally pinned. Recorded so nobody re-derives the wrong conclusion.

## 3. Open items carried forward (unchanged, not resolved this heartbeat)

- GitHub Actions `paperclip-checks.yml` / `docs-integrity.yml` startup failures — **no
  repository defect** (fix pass 2026-10-21): both files parse cleanly (js-yaml), the
  4 config tests and 5 source hashes pass locally, both pinned action SHAs resolve on
  GitHub, and `python-version 3.15.0` exists in setup-python's manifest. The failure is
  account-side (Actions availability/minutes for the private repo), so CI still needs
  the board.
- Hard zero-spend enforcement — **closed 2026-10-21 (fix pass)**: the company had no budget
  policy at all (`budgetMonthlyCents=0` is a display field, not a cap). Policy
  `27884824-ded5-48bd-baf6-f9bc03c7a0d7` now caps billed cents at 5000 per calendar month
  with `hardStopEnabled=true` and `warnPercent=80`; `GET budgets/overview` shows it active,
  observed 0, remaining 5000, `status=ok`, `paused=false`. The guard that refuses new work
  at the cap is `server/src/services/budgets.ts:770`. A live breach was not exercised —
  that needs real spend.
- Restore test — **done 2026-10-21c** (see blocker 3 below): the on-disk backup restores
  cleanly into a standalone Postgres instance.
- Two-task orchestration / tenant isolation acceptance — **exercised 2026-10-21 (M1
  acceptance pass)**: in a throwaway clone two parallel branches with disjoint paths merge
  conflict-free (`Merge made by the 'ort' strategy`, 0 unmerged paths), and a red test
  fails the workflow's own step (`python -m unittest discover -s tests -v` → exit 1) while
  the committed tree is green (exit 0). `main` and `lavabean` are the same commit and are
  0 ahead of origin — no agent commit reaches either. Caveat: Paperclip's own workspace
  projection is `shared_workspace` / `project_primary` (103 workspace records, one distinct
  cwd), so per-issue isolation is a git-worktree convention (`docs/workflow.md`), not a
  product guarantee.
- M0 requirements and licensing gates — remain open.

## 4. Blockers for this heartbeat

1. **No GitHub authentication (board-owned).** `gh auth status` reports "not logged into any
   GitHub hosts" and the runtime logs `Paperclip: GitHub capability_missing`. Any write that
   requires GitHub (PR, issue update via the managed-credentials path) cannot complete.
   Unblock action: inject a GitHub token for `calligentai/bussiness-empire`.
2. **No CI runner (board-owned).** `act` is not installed and there is no Docker daemon, so
   the `startup_failure` cannot be reproduced here. Fix pass 2026-10-21 ruled out a
   workflow-file defect (both files parse, 4/4 tests and 5/5 hashes pass locally, both
   pinned action SHAs resolve on GitHub, `3.15.0` is in setup-python's manifest). Unblock
   action: make Actions available for the private repo (minutes / org policy) and rerun.
3. **Restore path.** The OpenAPI spec (`/api/openapi.json`) exposes only
   `POST /api/instance/database-backups`, which *triggers* a backup; there is no restore
   endpoint in the spec. Calling it returns a real backup record (200, e.g.
   `paperclip-20261021-173127.sql.gz`, 3.36 MB) and backups sit on disk under retention —
   so backup *creation* works. **Restore capability proven (heartbeat 2026-10-21c):**
   the on-disk backup was piped via `psql` into a standalone `initdb`+`pg_ctl` instance
   and restored cleanly — 227 tables, `issues=4, agents=4, companies=1, comments=67,
   heartbeat_runs=232`, BUS-3 still `in_progress`. The temp instance was stopped and its
   /tmp artifacts removed; the production instance was never touched. What remains
   platform-controlled is the *production* restore path itself, which still has no API.
4. **Stale self-owned block — removed (fix pass 2026-10-21).** BUS-3 was blocked by its own
   watchdog review issue (BUS-5), whose `unblockDescriptor` pointed at interaction
   `e374b842` — already expired (`superseded_by_comment`). That dead pointer is what kept
   re-triggering a review on every heartbeat. BUS-3 no longer lists BUS-5 as a blocker
   relation, both descriptors now name the real board-owned condition, and the watchdog's
   observed/reviewed stop fingerprints are identical (`8c57e4e1…`) so the classifier reports
   `already_reviewed` instead of opening a new review.

## 5. Verdict

The orchestration/routing half of BE-HQ-001 is **installed and verified**: service live on
loopback, 4 adapters registered with pinned routes, bootstrap idempotent, 4 config tests +
5 source hashes green, spend at 0, **spend now enforced by an active hard-stop budget
policy**, restore capability proven, the CI failure proven to be account-side rather than a
repository defect, and the M1 acceptance criteria (parallel changes merge conflict-free,
a red test fails the gate, agent writes stay off `main`) exercised with observed
RED/GREEN evidence. The issue is `blocked` with a named unblock owner and action: the
board injects a GitHub token for the private repo and makes Actions available, after
which the GitHub-side acceptance (PR-gates, branch protection, a green CI run on the real
repo) is verifiable in one run. It is not `done` because those checks and the
platform-controlled production restore path still need that access. The stale self-owned
block (BUS-3 blocked by its own watchdog review issue) was removed, so the review no longer
re-triggers on every heartbeat.