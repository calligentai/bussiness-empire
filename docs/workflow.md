# Branches and worktrees

- main: release baseline; releases require explicit approval.
- lavabean: integration branch for LAVABEAN-PLATFORM.
- feature/<issue-id>-<slug>: one feature per branch and worktree; PR target lavabean.

The plan originally names integration and agent/<issue-id>-<slug>. The user's explicit branch choice takes precedence: lavabean is the integration baseline.

From /Users/admin/Projects/bussiness-empire:
    rtk git fetch origin
    rtk git worktree add -b feature/BE-LB-001-contract ../bussiness-empire-worktrees/BE-LB-001-contract origin/lavabean

Keep one writer per worktree. Review diffs and run relevant checks. Behavior changes require observed RED/GREEN evidence. Do not merge automatically. Preserve needed files before worktree cleanup.

Authentication reuses the GitHub CLI login in the OS keyring. Never commit credentials.

Private branch protection and Actions quotas depend on the owner plan. The account API did not expose a plan; do not assume enforcement or free quotas. No paid usage is authorized. CI has one bounded documentation job, no dependency install, no cache requirement and no uploaded artifacts. Default artifact retention is irrelevant without artifacts.

Imported source files retain exact original bytes. Their existing end-of-line whitespace is exempted through per-file .gitattributes; hashes verify fidelity. All other whitespace checks remain enabled.

## Bootstrap task split

BE-DOC-001 imports sources on feature/documentation. BE-DEV-001 adds workflow and CI on feature/dev-workflow. Its PR initially targets feature/documentation because checksum verification depends on those files. After BE-DOC-001 merges, retarget BE-DEV-001 to lavabean and rerun checks. No automatic merge.
