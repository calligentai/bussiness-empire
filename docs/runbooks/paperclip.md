# Paperclip orchestrator — BE-HQ-001

## Ownership and source

Business Empire HQ is the control plane. LAVABEAN-PLATFORM is its first project.
GitHub is the versioned code/document store. Paperclip owns task coordination, agent hierarchy, approvals and run evidence.

Upstream MIT source is included as the vendor/paperclip Git submodule, pinned to 41c18aa443fe791fa67b27eef28fd7239f5e9d5d. The upstream source is not forked or edited.

## Reproducible installation

Use an isolated feature worktree, Node 26.11.1 (upstream requires >=24.11.0), Python 3.15.0 and Corepack. Python helpers use the standard library only; requirements.txt has no pip dependencies. Reuse existing GitHub CLI keyring login.

From repository root:
    rtk git submodule update --init vendor/paperclip
    rtk proxy corepack pnpm@9.15.4 --dir vendor/paperclip install --frozen-lockfile
    rtk proxy corepack pnpm@9.15.4 --dir vendor/paperclip --filter @paperclipai/plugin-sdk build
    rtk proxy corepack pnpm@9.15.4 --dir vendor/paperclip --filter @paperclipai/paperclip-runner build:typescript
    rtk proxy python3 scripts/paperclip-local.py prepare
    rtk proxy python3 scripts/paperclip-local.py start

The supported dev:server command is used directly. The upstream root dev runner treats submodule .git files as linked worktrees and requires seeding, which is inappropriate for this fresh isolated company. The server creates and migrates its own embedded PostgreSQL database. No existing company database is copied.

After health succeeds, in another terminal:
    rtk proxy python3 scripts/paperclip-bootstrap.py

Bootstrap is name/idempotency-key based. It refuses any API endpoint other than the isolated loopback server and checks the exact upstream source commit.

## Local service and data

UI/API: http://127.0.0.1:3110
Embedded PostgreSQL: 127.0.0.1:54339
Private local state, logs and generated configuration: .local/paperclip (ignored by Git).

After stopping the foreground instance, install the current user's login service:
    rtk proxy python3 scripts/install-paperclip-service.py

Service label: com.calligentai.business-empire.paperclip.
Inspect:
    rtk proxy launchctl print gui/$(id -u)/com.calligentai.business-empire.paperclip
Stop:
    rtk proxy launchctl bootout gui/$(id -u)/com.calligentai.business-empire.paperclip

This is a user login service, not a public deployment. Do not remove/archive its owning feature worktree while the service points to it. Relocate/reinstall deliberately after merge; preserve .local data. Stopping the service does not delete data.

## Existing routing

- Codex orchestrator: codex_local, gpt-6-luna, existing http://127.0.0.1:6000/v1 Responses route.
- OpenCode engineer: opencode_local, opencode-go/deepseek-v4-pro, existing http://127.0.0.1:8789/v1 route.

Routes are discovered from existing user config and fail closed when missing. No fallback/provider is invented. The Codex agent receives an isolated CODEX_HOME with a private config copy and a reference to the existing auth file. OpenCode reuses its existing configuration and credential store. No credential value is committed, printed or embedded in agent instructions.

Timed heartbeats have intervalSec=0. Agent runs can be explicitly invoked; initial source tasks remain backlog. Existing subscription use is not permission for new paid APIs. Native budgetMonthlyCents=0 is not claimed to be a zero-spend hard stop; financial enforcement and paid-use approval remain an outstanding gate.

## Project and governance

Integration baseline: origin/lavabean.
Execution workspace policy: isolated git_worktree.
Feature template: feature/{{issue.identifier}}-{{slug}}.
Orchestrator: Business Empire Orchestrator, Codex.
Engineer: LavaBean Engineer, OpenCode; reports to orchestrator.
New agent hires require board approval. Telemetry and feedback data sharing are disabled.
No automatic merge, production deployment or new paid provider configuration.

## Validation and remaining gates

Run:
    rtk proxy python3 -m unittest discover -s tests -v
    rtk proxy shasum -a 256 -c docs/sources/SHA256SUMS

Three regression tests were observed failing before implementation: loopback isolation, route-preserving credential-free adapter config, and missing-route rejection. They passed after implementation. Canonical macOS /tmp resolution was corrected in the test expectations.

See paperclip/runtime-evidence.json for verified runs and live setup status.
Application-wide commerce tests do not apply to this control-plane integration.
M0, GitHub Actions startup failure diagnosis, paid-spend hard enforcement, restore testing and a full two-task merge/tenant-isolation proof remain open. Health and a connectivity smoke do not establish production readiness.

## Verified runtime, 2026-10-21

OpenCode Go is the user-selected engineer route: `opencode-go/deepseek-v4-pro` through `http://127.0.0.1:8789/v1`, with gateway model `opencode-go:deepseek-v4-pro`. Paperclip smoke succeeded with `EMPIRE_OPENCODE_GO_OK`, exit 0. Codex stays on its existing route. Zen gateway smoke failed with HTTP 403 FreeTierError; direct Zen test was cancelled at user instruction. No Zen route remains selected.

The user LaunchAgent is installed and running. Health and UI returned HTTP 200 after restart. Bootstrap rerun retained 2 agents, 1 project, 1 goal and 3 issues. Do not delete the service worktree while the LaunchAgent points to it.

Evidence: [runtime-evidence.json](../../paperclip/runtime-evidence.json). These connectivity checks do not prove full task orchestration or production readiness. OpenCode Go uses the existing account; no hard zero-spend cap has been established.

Validation fallback: the debug-cycle runner stopped because no executable review check was configured. The host performed explicit diff review; no private code was sent to an additional review provider. Four regression tests, five imported source hashes and whitespace checks passed. GitHub CI remains unverified until Actions startup failures are resolved.
