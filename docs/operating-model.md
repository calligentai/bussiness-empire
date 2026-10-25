# Operating model

How this project runs, and the checks that keep it honest. Every rule here exists because
its absence cost real money or real time; the enforcement is named with it, so the rule
does not depend on anyone remembering it.

## 1. Structure

- **One repo, one worktree per issue.** `business-empire` owns `.git`; every agent works in
  a worktree branched from `lavabean`. Nothing branches a second copy of the source.
- **Vendored code is read-only reference.** `vendor/paperclip` is a pinned checkout for
  reading and patching upstream behaviour. Agents do not create worktrees or clones inside
  it: its git metadata lives in the parent repo, so a clone's branch never reaches the board.
- **Enforced by** `scripts/ops/issue-preflight.py` (LaunchAgent every 3 min): an issue
  without a project, isolated `git_worktree` policy, writable repo, or resolvable base ref
  is held before it can keep consuming retries.

## 2. Fork hygiene

- Local changes to vendored Paperclip live in **one squashed commit** on
  `local/paperclip-patches`, with the behaviour grouped in the message.
- Upstream `master` stays fetchable; rebases are deliberate, not continuous.
- Old development history stays reachable as `rescue/*` refs — squashing is a
  readability decision, never a deletion.

## 3. One bug, one fix

- Before opening a fix, check `state/fix-ledger.json`. A title matching two keywords of a
  claimed entry is **held**, pointing at the commit that already fixed it.
- Fix at the layer that owns the behaviour. The `issueId`-on-wake defect was fixed five
  times at five layers (route → schema → CLI → body mapping → adapter) because each agent
  saw only its own layer.
- **Enforced by** the same pre-flight script (duplicate detection) and the ledger, which is
  updated when a fix lands — not inferred from prose.

## 4. Spend and quota

- The **key balance** is the meter; Paperclip's own ledger under-prices runs (445 unpriced
  in a day) and cannot be trusted for decisions.
- A subscription route is **$0 per token, not unlimited**: it draws on a rolling window
  with no readable headroom.
- **Enforced by** `scripts/ops/spend-guard.py` (every 30 min; $0.01 daily DeepSeek
  spend cap → freeze) and `scripts/ops/quota-guard.py` (every 5 min; 12M subscription
  input-token budget per rolling 5 hours → route non-essential agents to the free model).
  The quota guard counts every run from the company run feed, including unbound runs.

## 5. Loops

- **Enforced by** `scripts/ops/paperclip-loop-watchdog.py` (LaunchAgent every 3 min):
  cancels a run that repeats an
  empty streak, and holds the issue (`blocked` + `unblockDescriptor`, assignee cleared).
  A comment cannot be used to announce a hold — a comment on a blocked issue re-opens it.

## 6. Completion

- Done means an artifact: a commit on the issue's branch, a document, a merged change.
  "The agent said it finished" is not evidence.
- In review means a named reviewer who can see the artifacts, not a holding state.

## 7. Read it in one place

```
python3 ~/.hermes/profiles/pepperpotts/scripts/pc-status.py
```

Board health, open work, agent states, 5-hour subscription tokens, key balance, worktree
count — the six signals that used to live in six places.

## 8. Guard deployment

- Guard source and LaunchAgent definitions are versioned in `scripts/ops/` and
  `ops/launchagents/`; LaunchAgents execute this worktree's scripts.
- Preflight and loop-watchdog run at load and every 3 minutes. Spend guard runs every
  30 minutes; quota guard every 5 minutes.
- Automatic blocked-issue requeue remains disabled. Re-enabling it requires a resolution
  check; a retry count alone is not evidence that the root cause changed.
- Verify the loaded jobs with `launchctl list | grep calligentai.business-empire` and
  inspect each job's `last exit code` with `launchctl print gui/$(id -u)/<label>`.
