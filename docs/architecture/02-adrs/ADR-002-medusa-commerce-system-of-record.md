# ADR-002: Medusa is the commerce system of record

## Status

proposed

## Date

2026-10-23

## Deciders

LavaBean Engineer, Business Empire Orchestrator

## Context

The platform needs one authority for catalog, cart, checkout, orders, commerce
customer identities and fulfilment. The plan assigns exactly that to MedusaJS
and explicitly denies it double-entry bookkeeping (plan §2). The alternative —
spreading order state across frontend, CRM and Odoo — makes a single purchase
untraceable and makes reconciliation guesswork.

Version, licence and plugin costs are not yet registered (R0.1, DEP-01), so the
capability claim is not yet allowed to be treated as fact.

## Decision

Medusa owns catalog, cart, checkout, orders, commerce customer IDs, fulfilment
and sales channels. Every other system reads commerce facts from Medusa or from
events it emits; no other system holds an authoritative copy. Prices, stock and
order state are never computed outside Medusa.

## Consequences

- One test payment must produce exactly one order — the invariant every
  commerce test asserts (plan §5 M3).
- Odoo receives order and invoice facts from Medusa; it does not become a second
  source of order truth.
- The CRM must link to Medusa customers rather than own them (ADR-004).
- Medusa upgrades become migration events with their own ADR, not silent
  dependency bumps.

## Validation

Not yet validated. Blocked on DEP-01 (version and licence registered) and
DEP-04 (pinned sandbox instance). The test is INT-02: a sandbox payment produces
exactly one order, and a replayed webhook produces none.

## References

- plan §2 (Medusa row), §5 M3 R3.1-R3.4
- `../03-integration-register.md` INT-02, INT-04
- `../06-assumption-register.md` ASM-02, ASM-11
