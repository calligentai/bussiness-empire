# imacserver staging

Source baseline: staging/BUS-114-local-quality-gate-20261102 at 8a47ae3.
This release is a storefront and fictional read-only dealer demo. Checkout is
a local sandbox, with no real payment, supplier, Odoo or dealer credentials.

Build with the pinned pnpm lockfile and Node 22. Docker performs the Linux build
on imacserver. Runtime is unprivileged, read-only, limited to 512 MiB / 1 CPU,
and restarted unless explicitly stopped. Only the Tailscale IPv4 address exposes
port 18081; do not change this to 0.0.0.0 without adding access control.

## Release

1. Run pnpm test, pnpm build and the relevant Playwright browser checks.
2. Commit changes on a dedicated deployment branch; record the full revision.
3. Export git archive to /opt/lavabean-staging/releases/FULL_REVISION on imacserver.
4. Render compose.yaml placeholders: SOURCE_DIR = that immutable directory,
   REVISION = full Git revision, BIND_IP = imacserver's Tailscale IPv4.
5. Register the rendered Compose as the lavabean-staging service in the
   Business Empire project's staging environment in Coolify.
6. Start using Coolify. Check container health, /healthz revision, homepage,
   product, checkout and /dealer from a Tailscale client.
7. Preserve the rendered Compose and release metadata on imacserver.

The health endpoint is /healthz. Every staging response carries X-Robots-Tag:
noindex, nofollow, noarchive and Cache-Control: no-store.

## Second local-image service (port 18082)

The running Coolify Compose resource
`/data/coolify/services/ywwvl15ktujn5pydtfrug0mb/docker-compose.yml` is a
separate staging copy. It binds `100.111.84.46:18082:3000` with
`pull_policy: never` and the image name `lavabean-staging:<git sha>`. Do not
point it at a registry. Leave port 18081 untouched.

This release adds Medusa and Postgres beside the storefront on 18082 only.
The storefront bind stays `100.111.84.46:18082:3000`. Postgres is not published
on the host. Orders are rows in volume `lavabean-18082-postgres`. The rendered
file is `deploy/staging/compose.18082.yaml`. Payment behaviour is described in
`deploy/staging/COMMERCE.md`. Load `postgres:16-alpine` once before the first
start (`docker pull postgres:16-alpine`); the compose file then uses
`pull_policy: never` for every image.

Leave the original service on port 18081 untouched. Build and retag only on
the iMac, then point service `ywwvl15ktujn5pydtfrug0mb` at the new image.

From a source checkout:

```sh
docker build \
  -f deploy/staging/Dockerfile \
  --build-arg APP_REVISION=FULL_REVISION \
  -t lavabean-staging:FULL_REVISION \
  .
```

From the prebuilt storefront runtime archive (no pnpm on the iMac):

```sh
tar -xzf lavabean-runtime.tar.gz -C /opt/lavabean-staging/runtime/FULL_REVISION
docker build \
  -f /opt/lavabean-staging/runtime/FULL_REVISION/Dockerfile.runtime \
  --build-arg APP_REVISION=FULL_REVISION \
  -t lavabean-staging:FULL_REVISION \
  /opt/lavabean-staging/runtime/FULL_REVISION
```

Medusa image, from a source checkout (npm runs inside the image):

```sh
docker build \
  -f apps/medusa/Dockerfile \
  -t lavabean-medusa:FULL_REVISION \
  apps/medusa
```

Set `MEDUSA_DB_PASSWORD`, `MEDUSA_JWT_SECRET`, `MEDUSA_COOKIE_SECRET`,
`LAVABEAN_INTERNAL_TOKEN`, `MEDUSA_ADMIN_EMAIL`, and `MEDUSA_ADMIN_PASSWORD`
in the Coolify environment for this service. They are not in the repository.

Replace that service's Compose with `compose.18082.yaml` rendered so
`@@REVISION@@` is the full Git SHA. Keep `pull_policy: never` and
`100.111.84.46:18082:3000`. Redeploy only service
`ywwvl15ktujn5pydtfrug0mb`. Confirm `http://100.111.84.46:18082/healthz`
reports the new revision, `/product/dri-coffee-specialty-arabica-rwanda` loads,
and a test order placed in the browser can be opened again at `/order/LB-…`.
Confirm port 18081 still reports its previous revision.

## Rollback

Keep the previous release directory, rendered Compose and image.
In Coolify replace this service's Compose with the previous rendered Compose
and redeploy. Confirm /healthz reports the previous Git revision and smoke-test
the same pages. The original 18081 service has no database. The 18082 service
does: keep volume `lavabean-18082-postgres` when you roll the images back, or
the orders in that database go away with the volume. Do not put production
payment keys in this environment.
For the first release, stop this staging service in Coolify to roll back to
no staging deployment. Never stop or recreate unrelated services.
