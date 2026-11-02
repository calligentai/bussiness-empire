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

## Rollback

Keep the previous release directory, rendered Compose and image.
In Coolify replace this service's Compose with the previous rendered Compose
and redeploy. Confirm /healthz reports the previous Git revision and smoke-test
the same pages. No shared database or production credentials are attached.
For the first release, stop this staging service in Coolify to roll back to
no staging deployment. Never stop or recreate unrelated services.
