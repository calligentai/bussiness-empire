#!/usr/bin/env bash
# Local CI. No GitHub Actions: the calligentai account is billing-locked and hosted minutes are unwanted.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if command -v sha256sum >/dev/null 2>&1; then
  HASH="sha256sum"
else
  HASH="shasum -a 256"
fi

echo "== docs-integrity =="
$HASH -c docs/sources/SHA256SUMS
echo "OK"
