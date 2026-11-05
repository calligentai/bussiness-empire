# Dealer contracts

R5.1 tenant identity and isolation contracts, based on
[`docs/plans/R5.1-dealer-isolation-design.md`](../../../docs/plans/R5.1-dealer-isolation-design.md).

- `dealer_id` is the tenant boundary and must come from a verified token claim.
- Customer and order reads require a dealer context and only match records carrying
  that exact `dealerId`; missing tenant IDs are never readable.
- Dealer hostnames are normalized and globally unique across dealers.
- Dealer membership roles are granted within one dealer context. Platform roles are
  separate and are intentionally not represented by these dealer-side grants.

These TypeScript contracts define application-level behavior. Persistent storage,
database row-level security, domain ownership verification and signed-token verification
remain responsibilities of the application and data layers that consume them.
