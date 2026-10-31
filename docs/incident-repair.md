# Bounded incident repair (R8.2)

Each incident starts in its own worktree and branch. From the active task checkout, create it with:

```sh
node scripts/incident-worktree.mjs BUS-123 ../BUS-123-repair
```

The helper accepts only `BUS-<number>` identifiers and creates `incident/bus-<number>` from `origin/lavabean`. The requested path must be outside the active checkout. Git refuses an existing branch or occupied path rather than reusing another incident's worktree. Use `--dry-run` to inspect the exact command without changing Git state. A failed creation is a stop condition; do not retry by reusing another worktree.

## Repair gates

1. Capture the incident symptom and reproduce it with one focused regression test. Record that test failing before the fix (RED).
2. Make one bounded repair attempt in the incident worktree, preserving provider, model, and endpoint routing. Re-run the same test and record it passing (GREEN), then run relevant existing checks.
3. If the regression still fails, stop and leave the incident blocked for human triage. Do not loop repairs, touch production, or spend paid credits.
4. Request independent review of the diff and RED/GREEN evidence. Risky changes require explicit human approval before merge. Open a PR against `lavabean`; never auto-merge or deploy.

The helper only creates an isolated Git worktree; it does not run repairs, tests, create PRs, or mutate production. The incident owner must link the PR and test evidence to its Paperclip issue.
