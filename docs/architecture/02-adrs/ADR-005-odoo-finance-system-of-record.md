# ADR-005: Odoo is the financial system of record

## Status

proposed

## Date

2026-10-23

## Deciders

LavaBean Engineer, Company owner (human)

## Context

The plan makes Odoo responsible for the general ledger, VAT, financial invoices,
reconciliation and accounting, and denies Medusa double-entry bookkeeping
(plan §2). Two systems that both "know" revenue is how a business ends up with
numbers nobody can defend, and VAT correctness is a legal obligation that needs
a qualified human in the loop (plan §7 finance gate).

## Decision

Odoo owns the ledger, VAT, financial invoices and reconciliation. Medusa emits
order, refund and credit facts; Odoo books them. No financial report is produced
from Medusa data. Journal and invoice mapping is versioned with the contract and
reconciliation runs before any release that touches commerce or finance.

## Consequences

- Revenue in the ledger is derived from immutable order events, not recomputed.
- Every booking needs an idempotency key so a retried event cannot book twice.
- Disagreement between Medusa and Odoo is a defect with an explicit repair path
  (reverse and rebook, never edit a posted entry).
- Finance sign-off requires a qualified human before production (plan §9 D4).

## Validation

Not yet validated, blocked on DEP-09 (Odoo edition, hosting and API surface).
The test is INT-07: book one sandbox order and one refund, reconcile to the cent,
then replay the event and prove no second journal entry appears.

## References

- plan §2 (Odoo row), §5 M4 R4.3-R4.4, §7 finance gate, §9 D4
- `../03-integration-register.md` INT-07
- `../04-risk-register.md` RISK-04
