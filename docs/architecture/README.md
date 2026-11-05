# docs/architecture — LavaBean platform architecture (M0/R0.3)

Status: **draft register, nothing here authorises implementation.** This directory
records what the master plan already fixes, what is proven, and what is only an
assumption. It is the input for the D0 research decision ("ADR's, licences and
P0 contracts are known"), not a substitute for it.

Source baseline: `Business Empire Master Execution Plan v1.1` (section 2 systems,
section 3 architecture decisions, section 5 milestones M0-M8, section 8 risks,
section 10 appendix). That plan currently lives on the `main` baseline; this
branch (`feature/BUS-19-...`) is cut from `lavabean`, so plan links are resolved
against `main` until `main` is merged into `lavabean`.

## Documents

| File | Contents |
|---|---|
| `01-system-boundaries.md` | System boundary diagram, authority and data-ownership table, trust boundaries |
| `02-adrs/` | Architecture decision records for the decisions the plan already fixes, with validation status |
| `03-integration-register.md` | Every integration with owner, dependency, failure mode, evidence status and feasibility test |
| `04-risk-register.md` | Risks with likelihood, impact, control and owner |
| `05-dependency-register.md` | Internal, external, human and platform dependencies that block work |
| `06-assumption-register.md` | Everything not verified yet, with the test that would verify it |
| `07-data-contracts.md` | Contract requirements between systems (idempotency, ownership); external payload shapes are unverified |

## Evidence vocabulary

Every claim in this set carries one of three labels. The label is a statement
about evidence, not about confidence.

| Label | Meaning | Machine rule |
|---|---|---|
| `verified` | A named issue or repository artifact proves it | Must cite `BUS-<n>`, `tests/`, `scripts/` or a PR, and the feasibility test must be `passed` |
| `assumption` | The plan states it, but no test has proven it yet, or the provider capability is unconfirmed | Must name the check that would confirm it |
| `unknown` | Not even the plan settles it: missing access, missing licence, missing decision | Must name the dependency that has to resolve first |

Owner names are the actual Paperclip company agents (`Business Empire
Orchestrator`, `LavaBean Engineer`, `Business Empire Hermes`, `Business Empire
Pi`, `Business Empire Codex`) plus `Company owner (human)` for account,
credential and payment authorization. Allocations are proposals pending
orchestrator confirmation (ASM-09).

## Rules this set follows

1. **No invented API capability.** No endpoint path, request body, field name or
   rate limit of an external provider is recorded here as fact. Where the plan
   needs a capability, the register records the *need* plus the test that would
   prove the capability exists.
2. **Unverified is never written as done.** A P0 integration is not closed by
   this document; it is closed by its feasibility test.
3. **Missing access is reported, not papered over.** Blocked access lives in the
   dependency register with a named unblock owner.

## Validation

The set is checked mechanically, not by reading:

```
python3 scripts/validate_architecture_docs.py
python3 -m unittest tests.test_architecture_docs -v
```

The checker fails when a required document is missing, when a P0 integration
lacks an owner, dependency, failure mode or feasibility test, when `verified` is
claimed without evidence, when a register reference dangles, or when an ADR is
`accepted` without a validation artifact. Negative tests in
`tests/test_architecture_docs.py` prove the checker actually catches those
defects instead of passing everything.

## Out of scope here

- Licences and versions per component: R0.1 source register (DEP-01).
- GoHighLevel / Lovable route assessment: R0.2 REA matrix, BUS-20 (DEP-02).
- Implementation, infrastructure, credentials, paid credits: not authorised.
