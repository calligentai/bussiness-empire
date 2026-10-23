# ADR-006: The Supplier Engine owns every supplier-facing flow

## Status

proposed

## Date

2026-10-23

## Deciders

LavaBean Engineer, Business Empire Orchestrator

## Context

The plan makes the Supplier Engine responsible for product import, mapping,
supplier orders, tracking and retry/idempotency, and forbids selling without an
authorised procurement API (plan §2, §7 supply-chain gate). Supplier APIs are
the least reliable dependency in the chain: timeouts are normal, and a timeout
is indistinguishable from a rejection unless the client is idempotent.

No supplier authorisation exists yet (DEP-06), so capability is `unknown`.

## Decision

One component owns all supplier traffic. Product import produces drafts only and
never publishes. Supplier orders carry a stable idempotency key derived from the
order line, and a timeout is retried under that key rather than treated as a new
order. Unacknowledged orders go to a human hold queue instead of being retried
blindly.

## Consequences

- Duplicate shipment is prevented structurally, not by operator vigilance.
- Supplier outages delay fulfilment without corrupting commerce state.
- Import is reversible: drafts can be discarded without customer impact.
- Any new supplier requires an adapter with the same contract and its own
  authorisation record.

## Validation

Not yet validated, blocked on DEP-06 (written procurement authorisation and
sandbox credentials). The tests are INT-06 (idempotent transfer plus forced
timeout replay) and INT-08 (double import keeps one SKU mapping).

## References

- plan §2 (Supplier Engine row), §5 M4 R4.1-R4.2, §7 supply chain
- `../03-integration-register.md` INT-06, INT-08
- `../06-assumption-register.md` ASM-01, ASM-12
