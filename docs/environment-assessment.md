# Environment assessment — 2026-10-25 (M0 runtime and dependency inventory for M4)

Status: M4-scope inventory complete. Every runtime and dependency that M4 reads,
builds on, or must acquire has a version, license, access classification and
verification status below. Items that could not be verified are listed in
"Unverified items" with the action that would close them — none are silently
assumed.

M4 is "Leveranciers en Odoo" (R4.1 supplier engine, R4.2 supplier API adapter,
R4.3 Odoo journal/invoice mapping, R4.4 reconciliation and offline recovery), so
the inventory covers: the local toolchain that builds and tests M4, the M3
commerce baseline M4 extends (Next.js PWA), and the platform components named by
R0.1 that M4 reads or calls.

## How to read this document

- Version is what a command on the authorized Mac returned on 2026-10-25, or the
  exact revision read from the local repository or the official upstream at the
  cited revision. Upstream "latest" is never used as a version claim.
- License is the SPDX identifier or license name read from a local LICENSE file,
  a local `package.json`, Homebrew formula metadata, or the official upstream
  license text (URL in the Source column).
- Access classification: `local-free` (installed, no external account), `free`
  (public, no payment), `credentialed` (needs an account or secret), `paid`
  (needs a paid plan, subscription or credits), `unestablished` (no evidence
  either way).
- Verification: `verified` (claim produced by the cited command/source),
  `unverified-use` (present but usable access not proven), `blocked` (present but
  unusable for a stated reason), `unverified` (no evidence yet), `not in use`
  (absent and not referenced).

## Runtime toolchain

| Component | Version | License | Access | Verification | Source |
| --- | --- | --- | --- | --- | --- |
| macOS host (arm64) | 26.6.2, build 25G83 | Apple EULA (proprietary) | local-free | verified | `sw_vers`, `uname -m` |
| Node.js | 26.11.1 | MIT | local-free | verified | `node -v`; license from `brew info --json=v2 --formula node` |
| Node.js 20 keg (node@20) | 20.20.2 | MIT | local-free | not in use | `brew list --versions node@20`; no M4 artifact pins it |
| pnpm | 10.33.1 | MIT | local-free | verified | `pnpm -v`; license from `brew info --json=v2 --formula pnpm` |
| npm (bundled) | 11.20.0 | Artistic-2.0 | local-free | verified | `npm -v`; `/opt/homebrew/lib/node_modules/npm/package.json` |
| corepack | 0.34.6 | MIT | local-free | verified | `corepack --version`; `/usr/local/lib/node_modules/corepack/package.json` |
| Python | 3.15.0 | Python-2.0 (PSF) | local-free | verified | `python3 -V`; `brew info --json=v2 --formula python@3.15` |
| uv | 0.11.16 | Apache-2.0 OR MIT | local-free | verified | `uv --version`; `brew info --json=v2 --formula uv` |
| Git | 2.54.0 (Apple Git-157) | GPL-2.0-only | local-free | verified | `git --version`; license from `brew info --json=v2 --formula git` |
| GitHub CLI | 2.96.0 | MIT | credentialed | verified | `gh --version`; `gh auth status` (account `calligentai`, GH_TOKEN present) |
| Docker CLI | 29.8.2 | Apache-2.0 | local-free | blocked | `docker --version`; `docker info` fails: no `/var/run/docker.sock` |
| docker compose | 5.6.0 | Apache-2.0 | local-free | not in use | `brew list --versions docker-compose`; unused while the daemon is down |
| PostgreSQL server | 18.6 (Homebrew 18.6_1) | PostgreSQL License | credentialed | unverified-use | `psql --version`; `pg_isready` accepts `/tmp:5432`; `psql` demands a password this run does not hold |
| SQLite CLI | 3.51.0 (Apple) | Public domain (brew: blessing) | local-free | verified | `/usr/bin/sqlite3 --version`; `brew info --json=v2 --formula sqlite` |
| jq | 1.7.1-apple | MIT | local-free | verified | `/usr/bin/jq --version`; `brew info --json=v2 --formula jq` |
| Ollama (server/client) | server 0.40.6, client 0.40.5 | MIT | local-free | verified | `ollama --version`; `ollama list`; `brew info --json=v2 --formula ollama` |
| Homebrew | 7.0.10 | BSD-2-Clause | local-free | verified | `brew --version` |

## M4 baseline application dependencies

The M3/M4 commerce baseline is the Next.js PWA at
`/Users/admin/Projects/LAVA-BEAN/app/koffiefabriek-pwa` (package
`koffiefabriek-pwa` 0.1.0). Versions below are the ones resolved in
`node_modules`, read from each package's own `package.json`; `package-lock.json`
is the pin of record.

| Component | Version | License | Access | Verification | Source |
| --- | --- | --- | --- | --- | --- |
| next | 16.3.6 (exact pin) | MIT | local-free | verified | `node_modules/next/package.json` |
| react | 19.2.8 (exact pin) | MIT | local-free | verified | `node_modules/react/package.json` |
| react-dom | 19.2.8 (exact pin) | MIT | local-free | verified | `node_modules/react-dom/package.json` |
| ws | 8.22.0 (`^8.22.0`) | MIT | local-free | verified | `node_modules/ws/package.json` |
| tailwindcss | 4.3.3 (`^4`) | MIT | local-free | verified | `node_modules/tailwindcss/package.json` |
| typescript | 5.9.3 (`^5`) | Apache-2.0 | local-free | verified | `node_modules/typescript/package.json` |
| eslint | 9.39.5 (`^9`) | MIT | local-free | verified | `node_modules/eslint/package.json` |
| eslint-config-next | 16.3.6 (exact pin) | MIT | local-free | verified | `koffiefabriek-pwa/package.json` |

## Platform components named by R0.1

| Component | Version | License | Access | Verification | Source |
| --- | --- | --- | --- | --- | --- |
| Paperclip | pin 41c18aa443fe791fa67b27eef28fd7239f5e9d5d | MIT | free | verified | `.gitmodules` → github.com/paperclipai/paperclip; LICENSE and package.json read at that revision on raw.githubusercontent.com |
| Paperclip local checkout | submodule `vendor/paperclip` uninitialised | MIT (same pin) | free | unverified | `git submodule status`; no local clone contains 41c18aa |
| Paperclip API | 127.0.0.1:3110 listening | n/a (service) | local-free | verified | `lsof -nP -iTCP:3110 -sTCP:LISTEN` |
| OpenSEO | 0.1.12, commit 89e5a00 | MIT | free | verified | `/Users/admin/Projects/open-seo/LICENSE`; `package.json`; `git status --porcelain` shows 0 entries |
| opencode-token-reduction (TKR) | commit 343c880, version 1.0.0 | MIT | local-free | unverified | `package.json` declares MIT but the repo ships no LICENSE file; no git remote; 27 dirty entries |
| TKR gateway (container) | image from `gateway/Dockerfile` | MIT (inherited) | local-free | blocked | `lsof -nP -iTCP:40129` shows nothing; Docker daemon down |
| JEV guardrail plugin | `opencode-jev` 1.0.0, not under version control | unestablished | paid | unverified | `/Users/admin/Projects/opencode-jev/package.json` (license null); `opencode-token-reduction/jev/index.ts` |
| JEV remote classifier | metered Python bridge, opt-in | unestablished | paid | unverified | `JEV_GUARDRAILS_REMOTE=1` path; `/Users/admin/Projects/ecommerce-infrastructure/jev_integration/jev_bridge.py` |
| Headroom | no standalone installation found | unestablished | unestablished | unverified | referenced only in `opencode-token-reduction/gateway/*.md` |
| Medusa | not installed | MIT (upstream, not read locally) | free | not in use | `grep -c '"\(nuxt\|medusa\)' package-lock.json` returns 0; absent from the baseline |
| Nuxt | not installed | MIT (upstream, not read locally) | free | not in use | `package-lock.json` of koffiefabriek-pwa shows 0 nuxt/medusa entries; the baseline is Next.js |
| Odoo Community | 18 documented, none installed | LGPLv3 | free | verified | odoo.com/documentation/18.0/legal/licenses.html (HTTP 200, read 2026-10-25); no `odoo`/`odoo-bin` on PATH, no Homebrew formula |
| Odoo Enterprise | 18 documented, none installed | Odoo Enterprise Edition License v1.0 | paid | unverified | odoo.com/documentation/18.0/legal/licenses.html: use requires a valid Odoo Enterprise Subscription |
| Supplier API (R4.2) | none identified | per-supplier contract | credentialed | unverified | `grep -ril supplier` over this worktree matches only plan documents; `/Users/admin/Projects/LAVA-BEAN/app` has no match |
| LAVA-BEAN / calligentai/coffee | commit 3c46a24471cd4a20798867ac595f25c72f5b10f7 | unestablished | credentialed | unverified | `git -C /Users/admin/Projects/LAVA-BEAN rev-parse HEAD`; no LICENSE file at repo root; 96 status entries |
| GitHub plan and quota | account `calligentai`, repo `calligentai/bussiness-empire` | not applicable (account, not software) | credentialed | unverified | `gh api repos/calligentai/bussiness-empire` → public, admin=true; `gh api user` returns plan null |

## Known version and routing conflicts

- Paperclip pins `pnpm@9.15.4` (its `package.json#packageManager` at commit
  41c18aa); OpenSEO pins `pnpm@10.30.1`; the installed pnpm is 10.33.1. Use
  corepack or per-project isolated runtimes; do not downgrade the global pnpm.
- Paperclip requires `node >=24.11.0`; installed Node 26.11.1 satisfies it.
  opencode-token-reduction requires `node >=20`; also satisfied.
- Docker CLI 29.8.2 is installed but the daemon is not running, so any M4 step
  that needs containers (TKR gateway, containerised Odoo) is blocked until the
  daemon is started.
- The M4 baseline is Next.js 16 / React 19, not Medusa or Nuxt. Any plan text
  that assumes a Medusa/Nuxt stack for M4 is stale and would need a fresh
  evaluation before it can be treated as a dependency.
- Odoo licensing no longer needs guessing: the Community/Enterprise split is
  verified, but no edition or version is installed, so the Odoo target version
  remains an open decision owned by the M4 integration gate.

## Preserved prior findings

- LAVA-BEAN maps to calligentai/coffee at commit 3c46a244 with 96 status
  entries; that work is preserved and was not modified by this inventory.
- opencode-token-reduction was recorded earlier at 18 status entries; it now
  reports 27. Both the count and the commit are recorded above so the drift is
  visible rather than overwritten.
- OpenSEO remains clean at 89e5a00 with root MIT license.
- The technical-writer skill was not found in the searched locations; the plugin
  inventory therefore remains incomplete.
- No application install, startup or smoke test of Medusa, Nuxt or Odoo was
  performed, because none of them is present.
- Public-source GoHighLevel/Lovable comparisons, architecture/ADRs and P0 owners
  are tracked by their own issues (BUS-20, BUS-19) and are not duplicated here.
- The simulator remains at `/Users/admin/Projects/LAVA-BEAN/lavabean-simulator`.

## Unverified items

Each item names what would close it. None blocks the M4 documentation
deliverables, but a supplier or Odoo integration must not be represented as
available until the matching item is closed.

1. Odoo edition, version and access — close by choosing Community or Enterprise
   in the M4 integration gate, installing it, and recording `odoo --version`
   plus a successful database connection.
2. Supplier API contract, sandbox and credentials (R4.2) — close by naming one
   supplier, obtaining documented API access, and storing the credential in the
   approved local store; never in this repo.
3. PostgreSQL role and database for M4 persistence — the server answers on port
   5432 but rejects the run's credentials; close by provisioning a scoped role
   and recording that a connection succeeds, without exposing the secret.
4. Docker daemon — close by starting the daemon and recording `docker info`.
5. Paperclip submodule checkout at the 41c18aa pin — close by
   `git submodule update --init vendor/paperclip` and re-reading its LICENSE.
6. Weight licenses of the local Ollama models (qwen3.6:latest, qwen3.8:27b,
   qwen3.5:4b, gemma3:12b, gemma4 variants, nomic-embed-text) — the client is
   MIT, but each weight set carries its own terms.
7. JEV version, license and the terms of the metered remote classifier — close
   by placing JEV under version control with a LICENSE file and a documented
   price per call.
8. TKR repository hygiene — MIT is declared but not shipped as a LICENSE file,
   there is no git remote, and 27 files are dirty.
9. GitHub plan, quota and branch enforcement — the API exposes no plan for this
   token; close by reading the account billing page or recording CI limits.
10. Brand asset, font and media usage rights — tracked by BUS-88, not duplicated
    here.

## Verification commands

Reproduce the runtime rows (all read-only):

    sw_vers; uname -m
    node -v; pnpm -v; npm -v; corepack --version; python3 -V; uv --version
    git --version; gh --version; gh auth status
    docker --version; docker info
    psql --version; pg_isready
    /usr/bin/sqlite3 --version; /usr/bin/jq --version
    ollama --version; ollama list; brew --version
    brew info --json=v2 --formula node pnpm python@3.15 postgresql@18 sqlite jq git docker ollama uv corepack

Reproduce the application rows:

    cd /Users/admin/Projects/LAVA-BEAN/app/koffiefabriek-pwa
    for p in next react react-dom ws tailwindcss typescript eslint; do
      node -e "const p=require('./node_modules/$p/package.json');console.log(p.name,p.version,p.license)"
    done

Reproduce the platform rows:

    git submodule status
    git -C /Users/admin/Projects/open-seo rev-parse --short HEAD
    git -C /Users/admin/Projects/open-seo status --porcelain | wc -l
    git -C /Users/admin/Projects/opencode-token-reduction rev-parse --short HEAD
    git -C /Users/admin/Projects/opencode-token-reduction status --porcelain | wc -l
    curl -sS https://raw.githubusercontent.com/paperclipai/paperclip/41c18aa443fe791fa67b27eef28fd7239f5e9d5d/package.json
    curl -sS https://api.github.com/repos/paperclipai/paperclip
    curl -sSL https://www.odoo.com/documentation/18.0/legal/licenses.html
    gh api repos/calligentai/bussiness-empire; gh api user

Checked on 2026-10-25. Nothing outside this worktree was written: the LAVA-BEAN
tree and the Paperclip instance were inspected read-only. No existing
repository, runtime, service or credential was changed.
