#!/usr/bin/env python3
"""ChatGPT-subscription quota guard.

"$0 marginal" is a price, not a supply. The Codex route bills nothing per token but it
draws on the ChatGPT plan's rolling window, and the local proxy exposes no usage
readout (every /chatgpt/usage variant returns 403), so the only way to know how much has
gone through is to add up the runs' own usage metadata.

Per tick: sum `inputTokens` for runs whose `billingType` is `subscription_included`
inside the trailing window; once that crosses the budget, move the non-essential agents
(the ones that mostly route and summarise) onto the free route so the subscription is
kept for judgement work. Silent while under budget.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

BASE = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3110").rstrip("/")
COMPANY = os.environ.get("PAPERCLIP_COMPANY_ID", "857eb467-866b-45a1-a84f-92308790b2e9")
HEADERS = {"x-paperclip-user-id": "local-board", "Content-Type": "application/json"}

TOKEN_BUDGET = int(os.environ.get("QUOTA_GUARD_TOKENS", "12000000"))
WINDOW_HOURS = float(os.environ.get("QUOTA_GUARD_WINDOW_HOURS", "5"))
FREE_MODEL = os.environ.get("QUOTA_GUARD_FREE_MODEL", "kilo/cohere/north-mini-code:free")
# Agents that do not need the expensive route: they orchestrate and summarise.
DEMOTABLE = {
    "Business Empire Orchestrator": "38f3ba36-837c-49fa-9a47-56b840ba49a6",
    "Business Empire Pi": "0dccca7e-25ff-4e1b-a28a-8eb6d43594de",
}
DRY_RUN = os.environ.get("QUOTA_GUARD_DRY_RUN") == "1"


def api(method, path, payload=None, timeout=40):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read() or b"{}")
    except Exception as exc:  # noqa: BLE001
        return {"_error": str(exc)}


def parse_ts(value):
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def subscription_tokens(since):
    """Count every billed run in the rolling window, including unbound runs.

    The company run feed carries usage and start time for each heartbeat. Filtering by
    issue.updatedAt or taking only three runs per issue misses retries and unbound wakes,
    which are precisely the runs this guard must include.
    """
    records = api("GET", f"/api/companies/{COMPANY}/heartbeat-runs")
    if not isinstance(records, list):
        return None, 0

    total, counted = 0, 0
    for run in records:
        usage = run.get("usageJson") or {}
        if usage.get("billingType") != "subscription_included":
            continue
        started = parse_ts(run.get("startedAt"))
        if started is None or started < since:
            continue
        total += int(usage.get("inputTokens") or 0)
        counted += 1
    return total, counted


def demote():
    moved = []
    for name, aid in DEMOTABLE.items():
        agent = api("GET", f"/api/agents/{aid}")
        cfg = dict(agent.get("adapterConfig") or {})
        if cfg.get("model") == FREE_MODEL and agent.get("adapterType") == "opencode_local":
            continue
        cfg["model"] = FREE_MODEL
        cfg.pop("dangerouslyBypassApprovalsAndSandbox", None)
        if not DRY_RUN:
            api("PATCH", f"/api/agents/{aid}", {"adapterType": "opencode_local", "adapterConfig": cfg})
        moved.append(name)
    return moved


def main():
    since = datetime.now(timezone.utc) - timedelta(hours=WINDOW_HOURS)
    tokens, runs = subscription_tokens(since)
    if tokens is None:
        print("quota guard: board unreachable", file=sys.stderr)
        return 0
    if tokens < TOKEN_BUDGET:
        return 0
    moved = demote()
    print(
        f"QUOTA GUARD — {tokens:,} subscription input tokens in the last {WINDOW_HOURS:g}h "
        f"across {runs} runs (budget {TOKEN_BUDGET:,}). "
        + (f"Moved to free route: {', '.join(moved)}." if moved else "Non-essential agents were already on the free route.")
        + " Codex keeps the subscription."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
