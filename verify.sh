#!/usr/bin/env bash
# Local CI. No GitHub Actions: the calligentai account is billing-locked and hosted minutes are unwanted.
set -euo pipefail
# Checks the tree given as $1 (pre-push passes an export with no .git), else this script's own tree.
cd "${1:-$(dirname "${BASH_SOURCE[0]}")}"

if command -v sha256sum >/dev/null 2>&1; then
  HASH="sha256sum"
else
  HASH="shasum -a 256"
fi

echo "== docs-integrity =="
$HASH -c docs/sources/SHA256SUMS
echo "OK"

# Docs-only trees have no app to install, test or build.
[ -f package.json ] || exit 0

echo "== install =="
pnpm install --frozen-lockfile

echo "== tests =="
pnpm test

echo "== build =="
pnpm build
