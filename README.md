# Business Empire

Private portfolio repository. First venture: LAVABEAN-PLATFORM.

## Documents

- [Master plan v1.1](docs/plans/BUSINESS_EMPIRE_Master_Execution_Plan_v1.1_TDD_Production.md): active design baseline; not proof of implementation.
- [Original v1](docs/plans/archive/BUSINESS_EMPIRE_Master_Execution_Plan_v1.md): historical reference.
- [Sources and hashes](docs/sources/registry.json): original locations, roles and checksums.

Koffiefabriek documents in docs/background are background only. Their claims and requirements are not automatically adopted. The REA document is a research method, not execution authorization.

## Validation

From repository root, run: ./verify.sh

That script is the whole CI. GitHub Actions is deliberately not used: the calligentai account is billing-locked, and paid hosted minutes are out of scope.

It runs automatically at two points: `.githooks/pre-commit` calls `verify.sh` and refuses the commit, and `.githooks/pre-push` re-checks the tree being pushed (so `--no-verify` can't get around it). Enable on a fresh clone once:

    git config core.hooksPath .githooks

Update `docs/sources/SHA256SUMS` in the same commit whenever a tracked source document changes.

Also run: git diff --check

Documentation bootstrap has no application dependencies. Git, authenticated GitHub CLI and SHA-256 verification are required. Runtime isolation, manifests and lockfiles remain mandatory before application implementation.
