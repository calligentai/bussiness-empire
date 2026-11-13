# Staging commerce

The plan names Medusa as the commerce source (ADR-002, R3.1). This staging
slice does not run Medusa.

Medusa v2 needs PostgreSQL and a generated backend. This environment has no
Docker daemon, so that stack could not be started or tested here. The existing
storefront container is also capped at 512 MiB and a read-only root. A second
untested database service is not part of this release. No new backend service
is added to Compose.

What runs instead is a Nitro module, `server/commerce/store.ts`. It prices
lines from the in-repo Medusa-shaped catalog (`data/medusa-catalog.ts`) and
captures payment with the manual provider. That is the same idea as Medusa's
system provider (`pp_system_default`): one authorize-and-capture, no card
network, no live charge. Orders are written to `ORDER_DATA_DIR` and can be
read back from `GET /api/orders/:id` after a reload.

## Environment

| Variable | Required | Value in this release |
|---|---|---|
| `APP_ENV` | yes | `staging` (or unset/`test`/`development`). `production` refuses checkout. |
| `APP_REVISION` | yes | Full git SHA, set by Compose. |
| `PAYMENT_PROVIDER` | yes | `manual` |
| `ORDER_DATA_DIR` | yes on the iMac | `/data/orders` on the named volume. If unset, orders go to `/tmp/lavabean-orders` and disappear when the tmpfs or container goes away. |
| `NODE_ENV` | yes | `production` |
| `NITRO_HOST` | yes | `0.0.0.0` |
| `NITRO_PORT` | yes | `3000` |

No secret is required for the manual provider. Do not commit a filled `.env`.

## Keys that are recognized and not used

Setting any of these does not switch on a live or sandbox card payment:

- `PAYMENT_PROVIDER=stripe` with `STRIPE_SECRET_KEY` starting `sk_test_` and `STRIPE_WEBHOOK_SECRET` returns HTTP 501 `stripe_test_unwired`.
- `PAYMENT_PROVIDER=mollie` with `MOLLIE_API_KEY` starting `test_` returns HTTP 501 `mollie_test_unwired`.
- A Stripe key starting `sk_live_` or `rk_live_`, or a Mollie key starting `live_`, returns HTTP 403 `live_payment_refused` even when `PAYMENT_PROVIDER=manual`.

A later build can honor the test keys only after a real Stripe or Mollie sandbox client is added and covered by the same order test. Until then, leave `PAYMENT_PROVIDER=manual`.

## Medusa, when a host can run it

Not enabled. A future service would need its own image build (`pull_policy: never`), PostgreSQL, a publishable key, and a seed of the same four products. The storefront would then need `MEDUSA_BACKEND_URL` and `MEDUSA_PUBLISHABLE_KEY`. Those variables are ignored today.
