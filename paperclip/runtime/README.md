# Orchestrator control tools

This bridge exposes the existing Paperclip MCP issue tools plus five thin API
wrappers: paperclipListRuns, paperclipGetRun, paperclipReadRunLog,
paperclipReadRunEvents, and paperclipResolveIssueRecovery.

The bridge requires PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_AGENT_ID,
PAPERCLIP_COMPANY_ID, and PAPERCLIP_RUN_ID from the agent execution environment.
No board credential is installed. The API retains company boundaries, ownership,
run identity, recovery-action authority, approval rules, and mutation audit.

The recovery wrapper permits restored and blocked dispositions only.
Human-only false-positive/cancellation decisions and execution reconciliation
are not exposed. Missing permissions remain errors. Legacy MCP API errors are
explicitly marked isError so the model cannot mistake a completed transport
call for a successful operation.

## Installation

Use the installed Paperclip package's dist/index.js and its existing server
tsx loader. Run install_control_tools.py with --api-url, --agent-id,
--mcp-module, and --tsx-loader. These are deployment parameters.
Use a local trusted board endpoint for installation.

The installer copies the bridge to ~/.local/share/paperclip-control-tools/
under the agent ID, writes its OpenCode MCP config there, and sets only that
agent's OPENCODE_CONFIG environment entry. It preserves all other adapter
settings and the server preserves redacted stored environment values.

The runtime uses the existing Paperclip MCP package and SDK dependencies.
The tsx loader is necessary because workspace dependency exports reference
TypeScript sources. A raw Node launch failed before the loader was added.

Generated configs contain machine-specific paths, are ignored by Git, and
contain no saved agent credential. Removing this worktree does not remove the
installed bridge. The referenced Paperclip installation must remain available.

## Verification

Set PAPERCLIP_CONTROL_CONFIG to the installed opencode-control.json path and run:

    python3 paperclip/runtime/test_control_mcp.py

Six integration tests exercise real MCP stdio with a local HTTP fixture:
tool discovery, authenticated issue reads, bounded log reads, run audit headers
on recovery resolution, server-denial propagation, and human-only outcome
rejection before any API call.

Observed live results on 2026-11-03:
- The actual orchestrator OpenCode runtime discovered and called the new tools.
- The first model probe reported success despite using a wrong run ID for logs.
  That is a failed log verification, not evidence of successful log access.
- A second model probe drifted into extra reads and timed out.
- Exact MCP calls using a temporary credential for the same orchestrator identity
  successfully read an existing issue and a bounded existing run log.
- The recovery tool reached the API and received the expected 404 for a
  nonexistent target. No actual issue or recovery action was changed.
- The temporary verification credential was revoked in a finally block.
- The agent's original prompt template and timeout were restored.
- Its installed MCP config path remains enabled.

This proves tool delivery and authenticated read access. It does not claim a
real recovery resolution, a product task completion, or autonomous planning
correctness. No synthetic BUS issue was created for testing.
