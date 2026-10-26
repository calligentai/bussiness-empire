# Business Empire

Private portfolio repository. First venture: LAVABEAN-PLATFORM.

## Documents

- [Master plan v1.1](docs/plans/BUSINESS_EMPIRE_Master_Execution_Plan_v1.1_TDD_Production.md): active design baseline; not proof of implementation.
- [Original v1](docs/plans/archive/BUSINESS_EMPIRE_Master_Execution_Plan_v1.md): historical reference.
- [Sources and hashes](docs/sources/registry.json): original locations, roles and checksums.

Koffiefabriek documents in docs/background are background only. Their claims and requirements are not automatically adopted. The REA document is a research method, not execution authorization.

## Validation

From repository root, after `pnpm install`, run: ./verify.sh

That script is the whole CI. It checks `docs/sources/SHA256SUMS`, then runs `pnpm test` (Vitest). `pretest` runs `nuxt prepare`, so a clean checkout generates `.nuxt/tsconfig.json` before the suite.

GitHub Actions is deliberately not used. The calligentai account is billing-locked, so a workflow job is failed by GitHub before any step: no runner, no logs, and the annotation "The job was not started because your account is locked due to a billing issue." That is what the `test` check did on run [40108969876](https://github.com/calligentai/bussiness-empire/actions/runs/40108969876). Do not add a workflow that triggers on `push` or `pull_request` while the lock stands. GitHub records it as a failed check and never runs the suite.

It runs automatically at two points: `.githooks/pre-commit` calls `verify.sh` and refuses the commit, and `.githooks/pre-push` re-checks the committed doc hashes and runs `pnpm test` (so `--no-verify` can't get around the hash check). Enable on a fresh clone once:

    git config core.hooksPath .githooks

Update `docs/sources/SHA256SUMS` in the same commit whenever a tracked source document changes.

Also run: git diff --check

Git, authenticated GitHub CLI and SHA-256 verification are required for documentation work. The test gate also needs Node.js >= 20 and the pnpm version in `package.json`.
