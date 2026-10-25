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
- **Enforced by** `issue-preflight.py` (every 15 min): an issue whose project has no
  writable, self-contained repo to branch from is held before a run is spent.

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
- **Enforced by** `spend-guard.py` (daily burn → freeze the fleet) and `quota-guard.py`
  (5-hour subscription tokens → move non-essential agents to the free route).

## 5. Loops

- **Enforced by** `paperclip-loop-watchdog.py` (every 3 min): cancels a run that repeats an
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
