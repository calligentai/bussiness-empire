# ADR-004: CRM is an isolated module that links to commerce customers

## Status

proposed

## Date

2026-10-23

## Deciders

Business Empire Orchestrator, Business Empire Hermes

## Context

The plan gives the CRM leads, contacts, pipeline, interactions and
dealer-specific customer context, and explicitly forbids uncontrolled direct
write access to Medusa internals (plan §2). Leads arrive before a customer
exists, so the CRM cannot be reduced to a Medusa feature; but letting a CRM
write commerce tables would break ADR-002 and the tenant boundary.

The product route (own module on the commerce stack, or GoHighLevel) is
unresolved: R0.2 is BUS-20, still open. This ADR therefore fixes the boundary,
not the product.

## Decision

The CRM is a separate module with its own records. It links to a Medusa customer
through Medusa's own commerce interface and stores the resulting commerce
customer ID as a foreign reference. The CRM never writes Medusa tables, models or
internal state directly, and never becomes the authority for orders or prices.

## Consequences

- A lead can exist with no commerce customer, which is the normal pre-purchase
  state.
- Linking is idempotent: importing the same lead twice must not create a second
  commerce customer.
- CRM outage degrades sales follow-up, not checkout.
- The CRM choice can change later without touching commerce data, because only
  the reference layer is shared.

## Validation

Not yet validated, blocked on DEP-02 (BUS-20 R0.2). The test is INT-10: link one
lead to one commerce customer and prove a repeat import creates no duplicate.

## References

- plan §2 (CRM row), §5 M6 R6.1
- `../03-integration-register.md` INT-10
- `../05-dependency-register.md` DEP-02, DEP-12
