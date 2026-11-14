# Staging commerce

Milestone M3 names Medusa as the commerce source. This staging service runs
Medusa 2.22.7 as its own container, with Postgres 16 for the catalog, carts,
payments, and orders. The Nuxt storefront reads the catalog from the Medusa
Store API and completes checkout through Medusa.

The shopper basket stays in the browser until Pay now. That click creates a
Medusa cart, prices the lines from Medusa, and captures the manual provider.
The manual provider is Medusa's built-in system provider (`pp_system_default`):
one authorize and capture, no card network, no secret. A declined sandbox
payment is stored as a failed checkout and does not create a Medusa order.

Refunds and payment-webhook events are Medusa routes. A repeated webhook event
is ignored. A paid webhook after a refund does not mark the order paid again.
Stripe and Mollie are not called.

There is no shipping charge and no automatic tax on this milestone. The order
total is the catalog total. Dutch VAT is an M4 concern. Redis is not in the
compose file: Medusa 2.22 boots on Postgres alone and uses its local event bus
for this single process. The plan does not name Redis.

## Environment

Set these in Coolify for service `ywwvl15ktujn5pydtfrug0mb`. Do not commit the
values.

| Variable | Required | Purpose |
|---|---|---|
| `MEDUSA_DB_PASSWORD` | yes | Postgres password for the `medusa` user. Orders live in this database. |
| `MEDUSA_JWT_SECRET` | yes | Medusa session signing secret. |
| `MEDUSA_COOKIE_SECRET` | yes | Medusa cookie secret. |
| `LAVABEAN_INTERNAL_TOKEN` | yes | Shared by the storefront and Medusa so test namespaces stay off the public checkout. |
| `MEDUSA_ADMIN_EMAIL` | yes | Seeded Medusa admin, used for refunds. |
| `MEDUSA_ADMIN_PASSWORD` | yes | Admin password. Not a browser secret. |
| `APP_ENV` | yes | `staging`. `production` refuses checkout. |
| `APP_REVISION` | yes | Full git SHA. Compose sets it. |
| `PAYMENT_PROVIDER` | yes | `manual` |
| `MEDUSA_BACKEND_URL` | yes | `http://medusa:9000` inside Compose. |
| `NODE_ENV` | yes | `production` |

No payment secret is required for the manual provider. The publishable API key
is written by the Medusa seed to the `lavabean-18082-medusa` volume
(`/data/seed-state.json`) and read by the storefront. It is a publishable key,
not a secret. Do not commit a filled `.env`.

## Keys that are recognized and not used

- `PAYMENT_PROVIDER=stripe` with `STRIPE_SECRET_KEY` starting `sk_test_` returns HTTP 501 `stripe_test_unwired`.
- `PAYMENT_PROVIDER=mollie` with `MOLLIE_API_KEY` starting `test_` returns HTTP 501 `mollie_test_unwired`.
- A Stripe key starting `sk_live_` or `rk_live_`, or a Mollie key starting `live_`, returns HTTP 403 `live_payment_refused` even when `PAYMENT_PROVIDER=manual`.

## Volumes

- `lavabean-18082-postgres` is the database. Order rows are here.
- `lavabean-18082-medusa` holds the seed state, including the publishable key.

The earlier file volume `lavabean-18082-orders` is not mounted. Orders are not
JSON files anymore.
