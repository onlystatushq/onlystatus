# Deploy OnlyStatus

Self-hosted synthetic monitoring. No cloud dependencies. No feature gates. Just Docker.

## Quick Start

```sh
git clone https://github.com/neoyubi/onlystatus.git && cd onlystatus
./setup.sh && docker compose up -d
```

The `setup.sh` script generates `.env.docker` with random secrets. First startup takes a few minutes.

Once all services are healthy:

- **Dashboard**: [http://localhost:3002](http://localhost:3002)
- **Status Pages**: [http://localhost:3003](http://localhost:3003)

Register your account at the dashboard. First user gets full access automatically.

## What You Get

- **HTTP, TCP, and DNS monitoring** from local or distributed checkers
- **Public status pages** with custom domains, themes, and incident tracking
- **Alerts** via email, Slack, Discord, PagerDuty, OpsGenie, and more
- **Private locations** for monitoring from anywhere in the world
- **Password + TOTP + WebAuthn** authentication out of the box
- **Full REST and RPC API** for automation
- **Single compose file** with everything included, no external services required
- **All features unlocked**, no plan tiers or artificial limits

## Production Ready

For production, put OnlyStatus behind a reverse proxy with TLS. Works with Traefik, nginx, or Caddy.

Update your `.env.docker`:

```sh
NEXT_PUBLIC_URL=https://status.example.com
NEXT_PUBLIC_STATUS_PAGE_BASE_URL=https://pages.example.com
NEXTAUTH_URL=https://status.example.com
# Optional: enables subdomain routing (requires wildcard DNS + TLS)
# STATUS_PAGE_DOMAIN=pages.example.com
```

Apply the production overlay for resource limits and log rotation:

```sh
docker compose -f docker-compose.yaml -f docker-compose.prod.yml up -d
```

Reverse proxy examples for Traefik, nginx, and Caddy are in the [full deployment guide](./DEPLOYMENT.md#production-deployment).

## Private Locations

Monitor from anywhere by deploying lightweight checkers to additional locations.

### 1. Create a location in the dashboard under Settings > Private Locations

### 2. Copy the token

### 3. Deploy the checker

```sh
docker run -d \
  --restart unless-stopped \
  -e OPENSTATUS_KEY=<your-token> \
  -e OPENSTATUS_INGEST_URL=https://your-instance.com:8081 \
  neoyubi/onlystatus-checker:latest
```

No inbound ports needed. The checker pulls work and pushes results over HTTPS.

## Configuration

All settings live in `.env.docker`. The essentials:

| Variable | What it does |
|----------|-------------|
| `AUTH_SECRET` | Session encryption (required) |
| `SMTP_*` | Email notifications (optional) |
| `NEXT_PUBLIC_URL` | Your dashboard's public URL |
| `NEXT_PUBLIC_STATUS_PAGE_BASE_URL` | Your status page's public URL |

Full configuration reference, backup procedures, and troubleshooting in the [deployment guide](./DEPLOYMENT.md).
