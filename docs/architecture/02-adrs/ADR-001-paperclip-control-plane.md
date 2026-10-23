# ADR-001: Paperclip is the control plane, never a runtime dependency

## Status

accepted

## Date

2026-10-23

## Deciders

Business Empire Orchestrator, Company owner (human)

## Context

The plan puts Paperclip in charge of portfolio, agents, Kanban, issues,
approvals and harness workspaces (plan §2). The same plan requires that
checkout and booking keep working when Paperclip or a model provider is down
(plan §7 resilience) and forbids Paperclip from being responsible for order
processing, payment authority or the financial ledger.

Two shapes are possible: Paperclip as an orchestrator around the platform, or
Paperclip inside the order path. Only the first survives the resilience
requirement.

## Decision

Paperclip orchestrates work — issues, runs, approvals, evidence — and holds no
runtime position in commerce, payments, CRM or finance. Agents reach the
platform through pull requests on feature branches. No storefront, checkout or
booking request may depend on Paperclip being reachable.

## Consequences

- Delivery evidence is issue-shaped: every change is traceable to a branch, a
  PR and a status transition, which is what the platform's audit trail needs.
- Operational triage inside Paperclip can never be the cause of a failed
  customer order, because it is not on that path.
- Cost and provider routing decisions stay inside Paperclip, so provider
  outages degrade agent productivity rather than sales.
- The platform needs its own observability and alerting; Paperclip dashboards
  are not a substitute for production monitoring.

## Validation

Orchestration is proven: BUS-3 (install and verify orchestration and routing)
and BUS-4 (connect companion harnesses) are done, and BUS-16 shows an agent run
closing its own issue through the control plane.

The runtime-independence half is **not** proven — see ASM-05: stopping the
control plane during a sandbox checkout. Until that test runs, the runtime claim
is an assumption and this ADR's accepted status covers the orchestration half
only.

## References

- plan §1 (control plane role), §2 (system responsibilities), §7 (resilience)
- `../03-integration-register.md` INT-01
- `../06-assumption-register.md` ASM-05
