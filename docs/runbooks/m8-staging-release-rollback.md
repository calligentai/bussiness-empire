# M8 R8.3 controlled staging release and rollback

This runbook prepares a future, explicitly authorized non-production staging exercise. It does not authorize access to a staging account, production system, provider, or paid service. No production change, merge, or deployment is authorized by this document. Never place credentials, tokens, private keys, customer data, or secret-bearing output in this document, terminal logs, or the evidence record.

## Status and repository facts

- The repository currently defines no staging URL, deployment command, health endpoint, backup/restore command, or rollback command. Those steps are **BLOCKED** until the named owners supply and approve the missing inputs below.
- The app has a local dealer isolation test at `tests/dealer/isolation.test.ts`; this is not evidence of behavior on a staging service.
- `package.json` defines `pnpm test -- tests/dealer/isolation.test.ts` through Vitest's argument handling and `./verify.sh` as the repository's documentation integrity check. `./verify.sh` checks `docs/sources/SHA256SUMS`; it does not deploy or verify staging.
- `GET /` is not documented as a health endpoint in this repository. Do not treat it as one without an owner-supplied health contract.

## Owners must supply before a staging attempt

Record approved, non-secret values in the authorized issue or release record (not here):

1. **Release owner:** explicit approval for this non-production exercise, authorized staging URL, environment identity, access method, and allowed change window.
2. **Build/release owner:** deployment procedure, expected version/commit identifier as observed by the running service, and a way to capture it.
3. **Application owner:** health/readiness URL, expected status/body, timeout/retry policy, and any required safe smoke requests.
4. **Tenant owner:** two approved non-production dealer identities and the exact authorized isolation procedure/test data. Do not include credentials or personal data in evidence.
5. **Data/operations owner:** backup command or artifact procedure, location/reference, retention, integrity check, restore or rollback procedure, and the rollback decision authority.
6. **Incident owner:** incident log location, severity/notification path, and named operator/reviewer.

If any required value or command is missing, mark that step **BLOCKED/unknown**, identify the owner and exact missing input, and stop before performing the affected action. Do not access accounts or systems to discover missing details.

## Numbered preflight

1. Confirm the issue/release record identifies this exact run, the change under review, and a human-approved non-production scope. Confirm no production target is in scope.
2. Obtain the owner-supplied staging URL and access method through the approved channel. Confirm the URL is explicitly identified as non-production. Do not put credentials in shell history or evidence.
3. Capture the source branch and commit locally with `git branch --show-current` and `git rev-parse HEAD`. Capture the running version/commit only using the release owner's supplied method; mark it unknown if unavailable.
4. Run the repository's focused isolation check from the repository root: `pnpm test -- tests/dealer/isolation.test.ts`. Record the literal command, exit status, and concise result. This is local test evidence only.
5. Run `./verify.sh` from the repository root and record its exit status. This verifies tracked source hashes only.
6. Confirm the owner supplied a backup/rollback artifact procedure and a post-rollback verification procedure, and that the rollback decision owner is reachable. If not, stop and mark the staging action blocked.
7. Confirm evidence and incident-log locations are authorized and redact secret-bearing output before recording anything.

## Deploy and verify sequence (owner-supplied operations)

1. **BLOCKED until supplied:** execute the release owner's exact staging deployment command/procedure. This repository contains no deploy command. Record the approved procedure reference, operator, timestamp, and resulting version/commit; do not copy credentials or secret output.
2. **BLOCKED until supplied:** call the application owner's health/readiness endpoint and compare the response with the supplied contract. Record the endpoint label (or approved URL), expected and observed status, timestamp, and result. Do not invent an endpoint or expected response.
3. Run the authorized two-dealer staging isolation procedure supplied by the tenant owner. The local test in preflight does not substitute for staging evidence. Record only dealer labels/IDs approved for this evidence, the test reference, and pass/fail; never record credentials or customer data.
4. Record any failure in the incident log using the supplied location and procedure. Stop further rollout activity on a failed health or isolation gate and notify the designated owner.

## Rollback and verify sequence (owner-supplied operations)

1. The named release/rollback authority decides whether rollback is required and records the decision and time.
2. **BLOCKED until supplied:** capture/confirm the pre-change backup or rollback artifact using the data/operations owner's exact procedure. Record its non-secret reference and integrity-check result. Do not claim a backup exists without evidence.
3. **BLOCKED until supplied:** execute the approved staging rollback/restore procedure. This repository contains no rollback command. Record operator, timestamp, procedure reference, and observed result.
4. Repeat the supplied health/readiness check and the authorized two-dealer isolation procedure against the rolled-back staging version. Record expected/observed results and version/commit. If either fails, keep the incident open and escalate to the named owner; do not declare rollback successful.
5. Close the incident only under the incident owner's supplied criteria. Preserve the run record and artifact references in the authorized location.

## Evidence record template

```text
Issue/run:
Run date/time and operator:
Approval reference and approved scope (non-production):
Branch:
Source commit (git rev-parse HEAD):
Staging URL (owner-supplied; omit credentials):
Running version/commit (owner-supplied method):
Health check command/procedure and contract:
Health result (expected / observed / exit or status / timestamp):
Two-dealer isolation procedure/test reference:
Isolation result (pass/fail, approved dealer labels, timestamp):
Local check: pnpm test -- tests/dealer/isolation.test.ts (exit/result):
Repository docs check: ./verify.sh (exit/result):
Backup/rollback artifact reference and integrity result:
Rollback authority and decision:
Rollback procedure reference, operator, timestamp, result:
Post-rollback version/commit:
Post-rollback health result:
Post-rollback isolation result:
Incident log reference/status:
Blockers (owner + exact missing input/action):
Secrets/customer data included: no
Production touched: no
```

Never fill unknown fields with assumptions. Record **BLOCKED/unknown** and the owner input required. This template is not staging acceptance, does not satisfy or alter BUS-114 or BUS-115, and does not authorize a live staging account or production system.
