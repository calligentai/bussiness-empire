# Coolify deployment status — 2026-10-23

Audience: Paperclip, Hermes, Pi, OpenCode.

## Infrastructure
- Ubuntu iMac host: imacserver, LAN IP 192.168.178.92.
- Coolify dashboard: https://imacserver.tail100b58.ts.net:8443/
- Coolify real-time endpoint: wss://imacserver.tail100b58.ts.net:10000 (Tailscale Funnel to localhost:6001).
- Verified: dashboard /login HTTP 200; real-time /up HTTP 200; Coolify container healthy after restart.
- Tailscale Funnel publicly exposes both HTTPS endpoints. Never put credentials or tokens in this document.

## Pending work
- GitHub App github-calligentai for organization blindebeheerbv is NOT installed in Coolify: app_id, installation_id and client_id were null at last check.
- A GitHub organization owner must authorize/register the app. Do not invent IDs or claim automatic GitHub deployments work.
- Browser WebSocket connection still needs user-side confirmation after hard refresh.

## Agent instructions
- Paperclip: track GitHub App authorization and end-to-end deployment as blocked/pending; do not claim done.
- Hermes: use this as infrastructure context; test deployment only after authorization.
- Pi: use the same Coolify endpoint and verify access before any deployment.
- OpenCode: prefer isolated Git worktrees/branches per task, test before deploying; never store secrets in Git.
- Use Coolify for app deployment, not for LLM inference. Keep secrets in secure environment variables.
