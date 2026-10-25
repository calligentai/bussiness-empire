#!/usr/bin/env python3
"""Hard spend gate for the Paperclip fleet.

The `$5/day cap` in deepseek-spend.py is a *report* — nothing enforces it, and
Paperclip's own ledger prices only a fraction of runs (439 unpriced at last check),
so loops and experiments stay invisible until the key is nearly empty. This script is
the enforcement: it reads the hourly balance history, and once today's burn crosses the
cap it freezes the fleet — disables every agent's automatic heartbeat and pauses the
board driver — then says so. Deliberate, board-initiated wakes still work.

Silent while under the cap, so it can run every 30 minutes for free (--no-agent).
"""

import csv
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3110").rstrip("/")
COMPANY = os.environ.get("PAPERCLIP_COMPANY_ID", "857eb467-866b-45a1-a84f-92308790b2e9")
USAGE = os.path.expanduser("~/.hermes/profiles/pepperpotts/usage/usage.csv")
HEADERS = {"x-paperclip-user-id": "local-board", "Content-Type": "application/json"}

CAP_USD = float(os.environ.get("SPEND_GUARD_CAP_USD", "2.50"))
FLOOR_USD = float(os.environ.get("SPEND_GUARD_FLOOR_USD", "2.00"))
DRY_RUN = os.environ.get("SPEND_GUARD_DRY_RUN") == "1"
BOARD_DRIVE_JOB = "f8d1e96428ac"


def api(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read() or b"{}")
    except Exception as exc:  # noqa: BLE001
        return {"_error": str(exc)}


def today_spend():
    """(spent today, latest balance) from the hourly balance history, or (None, None)."""
    if not os.path.exists(USAGE):
        return None, None
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rows = []
    with open(USAGE, newline="") as fh:
        for row in csv.DictReader(fh):
            if row.get("account") != "deepseek" or not str(row.get("ts", "")).startswith(today):
                continue
            try:
                rows.append(float(row["remaining"]))
            except (KeyError, TypeError, ValueError):
                continue
    if len(rows) < 2:
        return None, (rows[-1] if rows else None)
    return rows[0] - rows[-1], rows[-1]


def freeze():
    acted = []
    agents = api("GET", f"/api/companies/{COMPANY}/agents")
    for agent in agents if isinstance(agents, list) else []:
        rc = dict(agent.get("runtimeConfig") or {})
        hb = dict(rc.get("heartbeat") or {})
        if hb.get("enabled") is False:
            continue
        hb["enabled"] = False
        hb.setdefault("wakeOnDemand", True)
        rc["heartbeat"] = hb
        if not DRY_RUN:
            api("PATCH", f"/api/agents/{agent['id']}", {"runtimeConfig": rc})
        acted.append(agent["name"])
    if not DRY_RUN:
        subprocess.run(["hermes", "cron", "pause", BOARD_DRIVE_JOB],
                       capture_output=True, text=True, timeout=60)
    return acted


def main():
    spent, balance = today_spend()
    if spent is None:
        return 0
    over_cap = spent >= CAP_USD
    under_floor = balance is not None and balance <= FLOOR_USD
    if not (over_cap or under_floor):
        return 0

    why = []
    if over_cap:
        why.append(f"burned ${spent:.2f} today, cap ${CAP_USD:.2f}")
    if under_floor:
        why.append(f"balance down to ${balance:.2f}")

    frozen = freeze()
    print(
        f"SPEND GUARD — {'; '.join(why)}. Fleet frozen"
        + (f" (heartbeat off: {', '.join(frozen)})" if frozen else " (heartbeat was already off)")
        + f". Board driver paused. Balance ${balance:.2f}."
        if balance is not None
        else f"SPEND GUARD — {'; '.join(why)}. Fleet frozen; board driver paused."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
