# Data contracts

Purpose: state which system owns which fact, and what every cross-system message
must guarantee. These are **contract requirements**, not provider schemas. No
external payload shape is asserted here; where a provider's actual field names
matter, they are marked unverified and must be recorded only after R0.1 and a
capability test.

## Ownership of facts

| Fact | Owner | Consumers | Never authoritative in |
|---|---|---|---|
| Product catalog, price, stock | Medusa | Storefront, dealer sites, Supplier Engine (read) | Nuxt, CRM, Odoo |
| Cart and checkout state | Medusa | Storefront | Nuxt |
| Order and fulfilment state | Medusa | Odoo, Supplier Engine, CRM (read) | Odoo, CRM |
| Commerce customer ID | Medusa | CRM (foreign reference only) | CRM |
| Lead, contact, pipeline, interaction | CRM module | Dealer dashboards | Medusa |
| Ledger entry, VAT, financial invoice, reconciliation | Odoo | Reporting, human finance review | Medusa, CRM |
| Supplier SKU mapping, purchase order, tracking | Supplier Engine | Medusa fulfilment, Odoo (read) | Medusa |
| Dealer identity, domain, brand overrides | Platform tenancy layer | All dealer-scoped systems | Any single service |
| Agent run, issue, approval, cost record | Paperclip | Humans, review gates | Commerce runtime |

## Required guarantees for every cross-system message

1. **Idempotency key.** Every event that can cause a side effect (order, refund,
   supplier transfer, journal entry) carries a stable key derived from the
   business fact, not from the transport attempt. Consumers must be able to
   recognise a replay by that key alone.
2. **Exactly-once effect on a retried delivery.** Delivery may happen more than
   once; the effect may not. The replay test is the acceptance criterion, not an
   extra.
3. **Ordering where it matters.** Order lifecycle transitions for one order are
   processed in order; independent orders are not serialised against each other.
4. **Tenant reference on every message.** No dealer-scoped fact travels without
   its dealer reference, and no consumer may infer the tenant from context.
5. **Failure is explicit.** Timeout, rejection and unknown are distinct outcomes.
   An unknown supplier or finance outcome goes to human review, never to blind
   retry.
6. **Versioned contracts.** A contract change is a versioned change with a
   migration path; consumers are not expected to absorb silent shape changes.

## Internal contract sketches (proposed, not agreed)

These are the platform's own shapes. Field names are our choice and may still
change; what matters for now is the invariant set above.

```
OrderPlaced
  order_ref            platform-assigned, stable
  dealer_ref           tenant reference
  currency, totals     monetary values with explicit currency
  lines[]              line ref, quantity, unit price, supplier SKU reference
  idempotency_key      derived from order_ref
  occurred_at          event time, distinct from processing time

RefundIssued
  order_ref, refund_ref, amount, currency, reason
  idempotency_key      derived from refund_ref

SupplierOrderRequested
  order_ref, supplier_order_key (per order line), lines[], dealer_ref
  idempotency_key      derived from supplier_order_key

FinanceBookingRequested
  order_ref or refund_ref, amount, currency, tax breakdown intent
  idempotency_key      derived from the booked fact
```

## External payloads: unverified

The actual request and response shapes for the payment provider, supplier APIs,
Odoo's API, the CRM route and every AI/SEO/social/voice provider are
**unverified**. They depend on DEP-01 (source register), DEP-02 (BUS-20 REA),
DEP-06 (supplier authorisation) and DEP-09 (Odoo edition and API surface).

Rules while they are unverified:

- Do not record endpoint paths, field names, limits or auth flows as fact, in
  code, tests or documentation.
- A mapping to a provider shape is written only after a capability test has
  passed, and the mapping records the test that proved it.
- Adapters isolate provider specifics so a corrected mapping does not touch
  domain logic.

## Reconciliation contract

For every order, the triple `(commerce order total, supplier acknowledgement,
ledger entry)` must agree. A mismatch is a defect with a repair procedure
(reverse and rebook, or re-issue the supplier transfer under the same key) —
never an in-place edit of posted records.

## Retention and secrecy

- Secrets, credentials and provider tokens never appear in Git, PR text, issue
  comments or test fixtures.
- Customer-identifying data stays within the owning system's boundary; other
  systems reference IDs.
- Agent transcripts are evidence, not a data store; no customer payload is
  pasted into a Paperclip comment.
