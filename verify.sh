#!/usr/bin/env bash
# Local CI. GitHub Actions cannot run this gate: the calligentai account is
# billing-locked, and GitHub fails the job before any step (empty step list).
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

if [[ -f package.json ]]; then
  echo "== pnpm test =="
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm is required to run the test gate (see packageManager in package.json)" >&2
    exit 1
  fi
  pnpm test
fi
