#!/usr/bin/env bash
# Local CI. No GitHub Actions: the calligentai account is billing-locked and hosted minutes are unwanted.
set -euo pipefail
# Resolved from the script path: pre-push runs this inside an exported tree with no .git.
cd "$(dirname "${BASH_SOURCE[0]}")"

if command -v sha256sum >/dev/null 2>&1; then
  HASH="sha256sum"
else
  HASH="shasum -a 256"
fi

echo "== docs-integrity =="
$HASH -c docs/sources/SHA256SUMS
echo "OK"

echo "== install =="
pnpm install --frozen-lockfile

echo "== tests =="
pnpm test

echo "== build =="
pnpm build
