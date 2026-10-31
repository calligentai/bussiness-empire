# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Lava Bean shoppers and dealers. The dealer is a task-level inference from BUS-111; the specific job represented by the dashboard is an explicitly fictional, read-only overview for local visual review.

## Product Purpose

Lava Bean presents Rwandan specialty coffee with traceable provenance and measured recipes. BUS-111 asks for a visually reviewable local/staging webshop and dealer dashboard.

## Positioning

The brand describes a product-first coffee platform that connects volcanic-origin beans, measured extraction, and individual taste. Source: `docs/brand/brand-dna.md`.

## Operating Context

The existing project is a Nuxt/Vue web application with a storefront home page and product detail page. A read-only dealer overview is inferred for a local demo; it does not represent a connected dealer account or live operation.

## Capabilities and Constraints

- Existing storefront routes and brand tokens are authoritative.
- No real data, payments, production deployment, paid providers, or provider/model/endpoint routing changes.
- Dashboard values must be fictional, labeled as demo data, and have no live operational effect.
- The dashboard is a local visual demo; production dealer workflows and data are undecided.

## Brand Commitments

Use the existing Lava Bean name, volcanic precision positioning, direct evidence-led voice, assets, and token rules in `docs/brand/brand-dna.md` and `brand/tokens.json`.

## Evidence on Hand

Existing product and brand implementation: `pages/index.vue`, `pages/product/[slug].vue`, `components/`, `brand/tokens.json`, and `docs/brand/brand-dna.md`. Existing checkout, order, and product sample data are local project fixtures. No connected dealer account or live dealer metrics are supplied.

## Product Principles

- Make bean, provenance, and measurement clear.
- Use evidence-led, direct language.
- Keep local demo data distinguishable from operational data.
- Preserve existing provider and routing behavior.

## Accessibility & Inclusion

The brand requires WCAG 2.2 AA as the floor, keyboard access, visible focus, and touch targets of at least 44 × 44 px.
