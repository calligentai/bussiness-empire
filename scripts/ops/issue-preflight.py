#!/usr/bin/env python3
"""Pre-flight gate for Paperclip issues: refuse work that cannot succeed.

Three failure classes this stops, each one observed and paid for:

1. WRONG STRUCTURE — an agent was pointed at a checkout whose git metadata lives
   outside its writable workspace (a submodule-style worktree). `git worktree add`
   fails there, the agent clones instead, and its branch never reaches the board.
   Check: resolve the repo behind each open issue's workspace root and assert the
   common git dir sits inside the writable tree.

2. UNRUNNABLE ISSUES — issues were created and woken for work the workspace could
   not host at all, burning a full session per attempt. Check: the base repo must be
   a real repo, on a branch, with a clean-enough tree to branch from.

3. SEVEN FIXES FOR ONE BUG — the same defect was fixed five times, at five layers,
   by agents that could not see each other's work. Check: a fix ledger of bug
   signatures already claimed; a new issue matching a claimed signature is held with
   a pointer to the existing commit instead of dispatching another attempt.

Held issues get `blocked` + an `unblockDescriptor` naming the owner and the action,
which is what actually stops the wake loop. Silent when everything checks out.
"""

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("PAPERCLIP_API_URL", "http://127.0.0.1:3110").rstrip("/")
COMPANY = os.environ.get("PAPERCLIP_COMPANY_ID", "857eb467-866b-45a1-a84f-92308790b2e9")
HEADERS = {"x-paperclip-user-id": "local-board", "Content-Type": "application/json"}

WRITABLE_ROOTS = [
    os.path.expanduser("~/Projects/bussiness-empire-worktrees"),
    os.path.expanduser("~/Projects/bussiness-empire"),
]
LEDGER = os.path.expanduser("~/.hermes/profiles/pepperpotts/state/fix-ledger.json")
MARKER = "preflight-hold"
DRY_RUN = os.environ.get("PREFLIGHT_DRY_RUN") == "1"


def api(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            return json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as exc:
        return {"_error": exc.code, "_body": exc.read().decode()[:200]}
    except Exception as exc:  # noqa: BLE001
        return {"_error": str(exc)}


def git(path, *args):
    try:
        out = subprocess.run(["git", "-C", path, *args], capture_output=True, text=True, timeout=30)
        return out.stdout.strip() if out.returncode == 0 else None
    except Exception:  # noqa: BLE001
        return None


def inside(path, root):
    try:
        return os.path.commonpath([os.path.realpath(path), os.path.realpath(root)]) == os.path.realpath(root)
    except ValueError:
        return False


def workspace_verdict(repo_root, base_ref=None):
    """None when Paperclip can actually branch work here, else the reason it cannot.

    Worktrees are created by the Paperclip server, not by the agent sandbox, so the test
    is whether *this process* can write the repo's common dir and resolve the base ref —
    not whether the agent's own directory contains it. Judging the agent's view flagged
    healthy projects whose workspace cwd is itself a worktree.
    """
    if not repo_root or not os.path.isdir(repo_root):
        return "workspace root does not exist"
    if git(repo_root, "rev-parse", "--is-inside-work-tree") != "true":
        return "workspace root is not a git worktree"
    common = git(repo_root, "rev-parse", "--path-format=absolute", "--git-common-dir")
    if not common:
        return "cannot resolve the git common dir"
    if not os.access(common, os.W_OK):
        return f"git metadata at {common} is not writable, so no worktree can be created"
    if base_ref and not git(repo_root, "rev-parse", "--verify", "--quiet", base_ref):
        return f"base ref {base_ref} does not resolve"
    return None


def matches_claimed(title, entry):
    """Hold when a title carries at least two of an entry's curated keywords.

    Keyword matching, not fuzzy similarity: two paraphrases of the same defect
    ("issueId binding on /heartbeat/invoke" vs "bind issueId on the wake path") share
    almost no English vocabulary but do share the terms that identify the code. The
    ledger is therefore curated when a fix lands, not inferred from prose.
    """
    text = str(title or "").lower()
    hits = [k for k in entry.get("keywords", []) if k.lower() in text]
    return len(hits) >= 2, hits


def load_ledger():
    try:
        return json.load(open(LEDGER))
    except Exception:  # noqa: BLE001
        return {}


def hold(issue, reason, action):
    if any(MARKER in json.dumps(c) for c in [issue.get("unblockDescriptor") or {}]):
        return False
    if not DRY_RUN:
        api(
            "PATCH",
            f"/api/issues/{issue['id']}",
            {
                "status": "blocked",
                "assigneeAgentId": None,
                "unblockDescriptor": {"owner": "board", "action": f"{MARKER}: {action}"},
            },
        )
    return True


def main():
    ledger = load_ledger()
    issues = api("GET", f"/api/companies/{COMPANY}/issues")
    if not isinstance(issues, list):
        print("preflight: board unreachable", file=sys.stderr)
        return 0

    actions = []
    for issue in issues:
        if issue.get("status") not in ("todo", "in_progress", "review", "in_review"):
            continue

        # 3. duplicate fix attempts
        claimed, hits = None, []
        for entry in ledger.get("claims", []):
            ok, matched = matches_claimed(issue.get("title"), entry)
            if ok:
                claimed, hits = entry, matched
                break
        if claimed:
            if hold(issue, "duplicate",
                    f"already fixed by {claimed['ref']} ({claimed['note']}); matched on {', '.join(hits)}. Verify that fix instead of writing another"):
                actions.append(f"{issue['identifier']}: held — duplicates {claimed['ref']} ({', '.join(hits)})")
            continue

        # Every executable issue must name a project so Paperclip can apply that
        # project's isolated-worktree policy. Do not silently allow projectless work:
        # that is how tasks ended up running in a shared agent home.
        if not issue.get("projectId"):
            if hold(
                issue,
                "workspace",
                "no project is assigned, so no isolated worktree can be guaranteed. Assign the correct project/workspace before unblocking.",
            ):
                actions.append(f"{issue['identifier']}: held — missing project/worktree binding")
            continue

        # 1 & 2. workspace can host the work
        project = api("GET", f"/api/projects/{issue['projectId']}")
        spaces = (project or {}).get("workspaces") or []
        roots = [w.get("cwd") for w in spaces if w.get("cwd")]
        if not roots:
            if hold(issue, "workspace", "project has no workspace; configure a repository workspace before unblocking"):
                actions.append(f"{issue['identifier']}: held — project has no workspace")
            continue

        policy = (project or {}).get("executionWorkspacePolicy") or {}
        strategy = policy.get("workspaceStrategy") or {}
        if (
            policy.get("enabled") is not True
            or policy.get("defaultMode") != "isolated_workspace"
            or strategy.get("type") != "git_worktree"
        ):
            if hold(issue, "workspace", "project does not enforce isolated git worktrees; enable the project worktree policy before unblocking"):
                actions.append(f"{issue['identifier']}: held — isolated git-worktree policy is not enabled")
            continue

        # A project is runnable when *any* of its workspaces can host a worktree. Agents
        # are rarely pointed at the repo root — they run inside one of its worktrees — so
        # judging a single workspace produced false holds on healthy projects.
        policy = (project or {}).get("executionWorkspacePolicy") or {}
        base_ref = ((policy.get("workspaceStrategy") or {}).get("baseRef")) or None
        verdicts = [(root, workspace_verdict(root, base_ref)) for root in roots]
        if any(reason is None for _, reason in verdicts):
            continue
        detail = "; ".join(f"{root}: {reason}" for root, reason in verdicts)
        if hold(issue, "workspace", detail):
            actions.append(f"{issue['identifier']}: held — no runnable workspace ({detail})")

    if actions:
        print("\n".join(actions))
    return 0


if __name__ == "__main__":
    sys.exit(main())
