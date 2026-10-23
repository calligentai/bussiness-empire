# ADR-003: Nuxt is presentation only

## Status

proposed

## Date

2026-10-23

## Deciders

LavaBean Engineer, Business Empire Orchestrator

## Context

The plan gives Nuxt responsibility for public Lava Bean and dealer websites,
SEO pages and brand compliance, and explicitly withholds authority over orders
and bookings (plan §2). Frontends that compute prices or hold order state are
the usual source of "the customer saw a different total" incidents, and they
duplicate what Medusa already owns.

## Decision

Nuxt renders catalog, cart and checkout flows against Medusa and holds no
authoritative order, price or booking state. Business rules live in the service
that owns the fact; the frontend may format and validate, never decide. Dealer
brand overrides come from centrally versioned templates (plan §5 M5 R5.2), not
per-site forks.

## Consequences

- Cart and checkout correctness is testable at the API layer, independent of
  rendering.
- SEO pages can be rebuilt or cached freely because they are derivable views.
- A frontend bug can show a wrong page but cannot create a wrong order.
- The storefront needs a resilient read path (cache or fallback) so catalog
  outages degrade gracefully.

## Validation

Not yet validated: no frontend exists on this branch lineage. The test is INT-03
(render home and product template at desktop and mobile width against approved
brand tokens) plus the INT-02 order invariant observed from the storefront.

## References

- plan §2 (Nuxt row), §5 M2 R2.3, M5 R5.2
- `../03-integration-register.md` INT-03
- `../06-assumption-register.md` ASM-09
