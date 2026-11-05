# ADR-007: Dealer isolation is tenant-scoped and proven by negative tests

## Status

proposed

## Date

2026-10-23

## Deciders

LavaBean Engineer, Business Empire Orchestrator

## Context

One platform must serve multiple dealers without cross-tenant reads (plan §5 M5,
§8 first risk row: dealer data leak, high impact). The plan offers Medusa sales
channels as the mechanism, but whether that mechanism is sufficient for
customers, orders **and** SEO credentials is not proven — hence ASM-11.

Isolation that is asserted by a positive test ("dealer A sees their own data")
is worthless; only a negative test that fails closed proves anything.

## Decision

Every dealer-scoped record carries a tenant reference and every query is scoped
by the authenticated dealer context, enforced at the data-access layer rather
than in each view. Dealer-brand overrides inherit from centrally versioned
templates. Multi-tenancy is proven by negative tests: a dealer A session asking
for dealer B resources must be refused on every route, not merely return empty.

## Consequences

- The isolation test suite is a release gate, not an optional extra.
- Any new dealer-scoped table or route requires a matching negative test in the
  same change.
- SEO, social and telephony credentials are per dealer and never shared.
- A failure is loud (403 or not-found), so leaks surface in testing rather than
  in production reporting.

## Validation

Not yet validated: no negative test has run. The test is INT-04: dealer A
session requests dealer B customer, order and SEO resources and is refused on
every route.

## References

- plan §2 (tenant boundaries), §5 M5 R5.1-R5.4, §8 leak risk
- `../03-integration-register.md` INT-04, INT-12
- `../06-assumption-register.md` ASM-11
