#!/usr/bin/env python3
"""Paperclip no-progress loop watchdog.

Kills the class of burn where an agent keeps getting woken for the same issue and
every run ends without leaving anything behind. Paperclip already throttles *some*
re-wakes (issue-rewake-throttle.ts: 2-run threshold, 2m->30m cooldown), but a
throttle only delays — the loop resumes when the cooldown expires, and
event-shaped wakes bypass it entirely. This is the hard stop.

Progress signal comes from the run's own liveness classification, not from
`issue.updatedAt`: the re-queue/repair machinery writes to every issue it touches,
so updatedAt moves even when the run achieved nothing. A run is counted as
no-progress when it is terminal and either
  * lastUsefulActionAt is null, or
  * livenessState is plan_only / empty_response / needs_followup, or
  * it failed or was interrupted (adapter_failed, orphaned run).

Per tick, for each open issue:
  * cancel a run that is `running` past KILL_AFTER_MIN with no useful action for
    IDLE_AFTER_MIN — that is the actual money leak;
  * block the issue once streak >= BLOCK_AFTER, or >= FAIL_BLOCK_AFTER when every
    run in the streak failed/interrupted, so wake sources stop re-arming it.

Silent when there is nothing to do, so it can run every 10 minutes for free
(--no-agent, no model calls).
"""

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3110").rstrip("/")
COMPANY = os.environ.get("PAPERCLIP_COMPANY_ID", "857eb467-866b-45a1-a84f-92308790b2e9")
HEADERS = {"x-paperclip-user-id": "local-board", "Content-Type": "application/json"}

BLOCK_AFTER = int(os.environ.get("WATCHDOG_BLOCK_AFTER", "3"))
FAIL_BLOCK_AFTER = int(os.environ.get("WATCHDOG_FAIL_BLOCK_AFTER", "2"))
# Backstop only. The primary trigger is repeated empty runs; a single runaway run is
# capped at the adapter timeout (1800s) plus slack, not at an arbitrary idle window.
HARD_TIMEOUT_MIN = int(os.environ.get("WATCHDOG_HARD_TIMEOUT_MIN", "35"))
SAMPLE = 8
MARKER = "auto-blocked: no-progress loop"
DRY_RUN = os.environ.get("WATCHDOG_DRY_RUN") == "1"

TERMINAL = {"succeeded", "failed", "cancelled", "interrupted"}

# Entering `blocked` requires unresolved blockers, a pending interaction, or this
# descriptor naming who must act and what they must do.
def hold_payload(streak, all_failed, rehold=False):
    # Dropping the assignee is what actually stops the loop: the liveness/assignment
    # reconciler re-wakes an in_progress issue that still has an owner, and it does so
    # within seconds, so a status flip alone loses the race. Verified on BUS-71:
    # blocked+unassigned stayed silent, blocked+assigned re-ran every ~75s.
    reason = "re-held, a new run appeared" if rehold else ("all failed/interrupted" if all_failed else "no useful action")
    return {
        "status": "blocked",
        "assigneeAgentId": None,
        "unblockDescriptor": {
            "owner": "board",
            "action": (
                f"{MARKER} ({streak} runs, {reason}). Assign an agent and move this issue back "
                f"to todo once the missing input or decision exists. Watchdog: block at "
                f"{BLOCK_AFTER} no-progress runs ({FAIL_BLOCK_AFTER} if all failed); a run that "
                f"repeats one is cancelled on sight, and any single run is capped at "
                f"{HARD_TIMEOUT_MIN}m."
            ),
        },
    }
NO_PROGRESS_STATES = {"plan_only", "empty_response", "needs_followup"}


def call(method, path, payload=None, timeout=30):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as exc:
        return {"_error": exc.code, "_body": exc.read().decode()[:300]}
    except Exception as exc:  # noqa: BLE001 - a dead board must not crash the cron job
        return {"_error": str(exc)}


def parse_ts(value):
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def minutes_since(value, now):
    ts = parse_ts(value)
    return None if ts is None else (now - ts).total_seconds() / 60.0


def is_no_progress(run):
    if run.get("status") not in TERMINAL:
        return False
    if run.get("status") in ("failed", "interrupted"):
        return True
    if run.get("lastUsefulActionAt") is None:
        return True
    return str(run.get("livenessState") or "") in NO_PROGRESS_STATES


def main():
    now = datetime.now(timezone.utc)
    actions = []

    issues = call("GET", f"/api/companies/{COMPANY}/issues")
    if not isinstance(issues, list):
        print(f"watchdog: board unreachable ({issues.get('_error')})", file=sys.stderr)
        return 0

    for issue in issues:
        if issue.get("status") not in ("in_progress", "todo", "review", "in_review"):
            continue
        runs = call("GET", f"/api/issues/{issue['id']}/runs")
        if not isinstance(runs, list) or not runs:
            continue

        # Enforce earlier verdicts first. A block is not sticky on its own: the
        # comment that records it is itself an event, so something re-wakes the agent
        # within a second and the issue walks back out of `blocked`. Re-arm the block
        # and cancel whatever run it produced, until a human edits the issue.
        # A comment cannot be used to announce the block: any comment on a blocked
        # issue is an `issue_reopened_via_comment` wake, so the explanation lived on the
        # issue itself would restart the loop one second later. The descriptor carries it.
        already_flagged = MARKER in json.dumps(issue.get("unblockDescriptor") or {})
        if already_flagged:
            live = runs[0]
            if live.get("status") == "running" and not DRY_RUN:
                call("POST", f"/api/heartbeat-runs/{live['runId']}/cancel", {})
            if not DRY_RUN:
                call("PATCH", f"/api/issues/{issue['id']}", hold_payload(0, True))
            actions.append(
                f"{issue['identifier']}: re-held by watchdog"
                + (" and cancelled a fresh run" if live.get("status") == "running" else "")
            )
            continue

        # Count the streak first: the kill decision is run-count based, not wall-clock.
        # Three runs that left nothing behind means the fourth is a repeat by
        # construction, so it gets killed on sight instead of being allowed a
        # timeout's worth of tokens.
        streak = 0
        all_failed = True
        for run in runs:
            if run.get("status") == "running":
                continue
            if not is_no_progress(run):
                break
            if run.get("status") not in ("failed", "interrupted"):
                all_failed = False
            streak += 1
            if streak >= SAMPLE:
                break

        live = runs[0]
        if live.get("status") == "running":
            ran_for = minutes_since(live.get("startedAt"), now)
            repeat = streak >= (FAIL_BLOCK_AFTER if all_failed else BLOCK_AFTER)
            # Backstop only: a single long run with no repeated failures still needs a
            # ceiling, and that ceiling is the adapter's own timeout, not an invented one.
            overrun = ran_for is not None and ran_for >= HARD_TIMEOUT_MIN
            if repeat or overrun:
                if not DRY_RUN:
                    call("POST", f"/api/heartbeat-runs/{live['runId']}/cancel", {})
                why = (
                    f"{streak} consecutive empty runs already"
                    if repeat
                    else f"exceeded the {HARD_TIMEOUT_MIN}m hard ceiling"
                )
                actions.append(
                    f"{issue['identifier']}: cancelled run {live['runId'][:8]} ({why})"
                )
                if repeat:
                    if not DRY_RUN:
                        call("PATCH", f"/api/issues/{issue['id']}", hold_payload(streak, all_failed))
                    actions.append(f"{issue['identifier']}: blocked after {streak} no-progress runs")
                continue

        limit = FAIL_BLOCK_AFTER if all_failed else BLOCK_AFTER
        if streak < limit:
            continue

        if not DRY_RUN:
            call("PATCH", f"/api/issues/{issue['id']}", hold_payload(streak, all_failed))
        actions.append(f"{issue['identifier']}: blocked after {streak} no-progress runs")

    if actions:
        print("\n".join(actions))
    return 0


if __name__ == "__main__":
    sys.exit(main())
