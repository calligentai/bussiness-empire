# Assumption register

Everything this architecture set relies on that is not proven yet. Each entry
names the check that would settle it. Status is `open` until that check runs;
`confirmed` and `refuted` require a cited result.

An `open` assumption is not permission to build on it. Where an assumption
blocks a P0 row in the integration register, that row is `assumption` or
`unknown` and its test is `planned` or `blocked`.

| ID | Assumption | Basis | Verification | Owner | Status |
|---|---|---|---|---|---|
| ASM-01 | Hifany (and optionally AliExpress) offer an authorised procurement API that supports order transfer and tracking for this volume | plan §5 M4 R4.2, supplier section of the REA document | Obtain written API documentation and authorisation, then run one sandbox order transfer and a timeout replay | LavaBean Engineer | open |
| ASM-02 | The chosen Medusa version and licence support catalog, cart, checkout, orders and sales channels as the plan assumes, without paid plugins | plan §2 Medusa row, §5 M3 | Register version and licence in R0.1, install the pinned version and exercise checkout in a sandbox | LavaBean Engineer | open |
| ASM-03 | The available Odoo edition exposes journal-entry and invoice mapping over an API that the Supplier/Commerce side can call | plan §5 M4 R4.3 | Stand up the instance, book one sandbox order and reconcile to the cent | LavaBean Engineer | open |
| ASM-04 | A payment sandbox can be obtained without handling live card data and can replay webhooks on demand | plan §5 M3 R3.3-R3.4 | Open sandbox account, trigger a duplicate webhook and confirm idempotency | LavaBean Engineer | open |
| ASM-05 | Commerce checkout and booking keep working while Paperclip or a model provider is down | plan §7 resilience requirement, §2 boundary table | Stop the control plane during a sandbox checkout and confirm the order completes | Business Empire Orchestrator | open |
| ASM-06 | A CRM route exists that gives leads, contacts and pipeline without direct writes into commerce internals | plan §5 M6 R6.1, R0.2 scope | R0.2 outcome (BUS-20), then a customer-link round trip test | Business Empire Hermes | open |
| ASM-07 | Harness routing and issue write-back work for the two companion harnesses already connected | BUS-4 and BUS-16 completed end to end through the control plane | Extend the same check to every remaining role before M1 sign-off; the check is one issue per role writing its own status back | Business Empire Orchestrator | confirmed |
| ASM-08 | At least one free official model endpoint is reachable for each flow that needs generation, without paid credits | plan §1 AI preference order | Route one request per provider and record endpoint, model, cost and failure behaviour | Business Empire Pi | open |
| ASM-09 | Brand DNA and design tokens can be expressed machine-readably and checked in CI | plan §5 M2 R2.2-R2.4 | Build tokens plus a deliberately wrong spacing rule and confirm the check fails | LavaBean Engineer | open |
| ASM-10 | OpenSEO's free tier covers audits, metadata and sitemap checks at zero cost per dealer | plan §5 M5 R5.3-R5.4 | Run a free audit under a hard zero budget and confirm no paid call is made | Business Empire Hermes | open |
| ASM-11 | Medusa sales-channel scoping is sufficient for dealer isolation (one platform, many dealers) | plan §5 M5 R5.1 | Negative test: dealer A session requests dealer B customer, order and SEO resources and is refused everywhere | LavaBean Engineer | open |
| ASM-12 | Supplier feeds allow unique SKU mapping without manual reconciliation on every import | plan §5 M4 R4.1 | Import the same feed twice and prove mapping stays unique and products remain drafts | LavaBean Engineer | open |
| ASM-13 | This branch lineage will receive the `main` baseline documents (plan, sources registry, REA document) before implementation starts | repository state: `lavabean` currently holds only README and .gitignore | Confirm the merge of `main` into `lavabean` and re-run the documentation check on the result | Business Empire Orchestrator | open |
| ASM-14 | The owner allocations in this register match the orchestrator's intended role split | Paperclip company agent list at the time of writing (BUS-3) | Orchestrator confirms or reassigns per row; the register is updated in the same change | Business Empire Orchestrator | open |

## How an assumption is closed

1. Run the named verification and keep the output (command, result, date) in the
   issue that owns the integration.
2. Flip this row to `confirmed` or `refuted`.
3. Update the matching integration row: `assumption` to `verified` with the
   citation, or `assumption` to `unknown` with the new blocker.
4. Re-run `python3 scripts/validate_architecture_docs.py`; a `verified` row with
   a non-passing test or no citation fails the check.
