# Business Empire

Private portfolio repository. First venture: LAVABEAN-PLATFORM.

## Documents

- [Master plan v1.1](docs/plans/BUSINESS_EMPIRE_Master_Execution_Plan_v1.1_TDD_Production.md): active design baseline; not proof of implementation.
- [Original v1](docs/plans/archive/BUSINESS_EMPIRE_Master_Execution_Plan_v1.md): historical reference.
- [Sources and hashes](docs/sources/registry.json): original locations, roles and checksums.

Koffiefabriek documents in docs/background are background only. Their claims and requirements are not automatically adopted. The REA document is a research method, not execution authorization.

## Validation

From repository root, run: shasum -a 256 -c docs/sources/SHA256SUMS
Then run: git diff --check

Documentation bootstrap has no application dependencies. Git, authenticated GitHub CLI and SHA-256 verification are required. Runtime isolation, manifests and lockfiles remain mandatory before application implementation.

## Paperclip control plane

[Install and operate the orchestrator](docs/runbooks/paperclip.md). Upstream source is pinned as a Git submodule. Runtime state and credentials are excluded from Git.
