# Deployment Guide

Complete guide for deploying OnlyStatus, a self-hosted synthetic monitoring platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [First Login](#first-login)
4. [Configuration Reference](#configuration-reference)
5. [Production Deployment](#production-deployment)
6. [Private Locations](#private-locations)
7. [Monitoring Types](#monitoring-types)
8. [Upgrading](#upgrading)
9. [Backup & Restore](#backup--restore)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Docker** 24.0+ with **Docker Compose** v2
- **4 GB RAM** minimum, **6 GB recommended** (Tinybird-local alone uses ~1.5-2 GB at steady state)
- **10 GB disk** for images and data
- **x86_64 architecture** (Tinybird analytics does not support ARM natively; Apple Silicon users need Rosetta/QEMU)

### Resource Breakdown

| Service | Typical Usage | Limit (prod overlay) |
|---------|--------------|---------------------|
| Tinybird-local | ~1.5-2 GB | 2 GB |
| Dashboard (Next.js) | ~200-400 MB | 1 GB |
| Status Page (Next.js) | ~200-400 MB | 512 MB |
| Workflows (Hono) | ~150 MB | 512 MB |
| Server (Hono) | ~100 MB | 512 MB |
| libSQL | ~50-100 MB | 512 MB |
| Checker (Go) | ~30 MB | 256 MB |
| Private Location (Go) | ~30 MB | 256 MB |

Tinybird is the dominant consumer. If you are running on a VPS with limited RAM, make sure it has at least 2 GB available for Tinybird or the process will be OOM-killed and analytics will stop working.

The production overlay (`docker-compose.prod.yml`) sets `mem_limit` for each service. These use standalone compose syntax, not Swarm-mode `deploy.resources.limits`.

Verify your setup:

```sh
docker --version    # Docker 24.0+
docker compose version  # v2.x
```

## Quick Start

```sh
git clone https://github.com/onlystatushq/onlystatus.git && cd onlystatus
./setup.sh && docker compose up -d
```

The `setup.sh` script generates `.env.docker` with random secrets. If you prefer to configure manually:

```sh
cp .env.docker.example .env.docker
sed -i "s|^AUTH_SECRET=$|AUTH_SECRET=$(openssl rand -base64 32)|" .env.docker
sed -i "s|^TOTP_ENCRYPTION_KEY=$|TOTP_ENCRYPTION_KEY=$(openssl rand -hex 32)|" .env.docker
sed -i "s|^CRON_SECRET=change-me-to-a-random-string$|CRON_SECRET=$(openssl rand -base64 32)|" .env.docker
docker compose up -d
```

First startup takes a few minutes while Docker builds the images and initializes the databases. Monitor progress with:

```sh
docker compose ps
docker compose logs -f
```

Once all services are healthy:
- **Dashboard**: http://localhost:3002
- **Status Pages**: http://localhost:3003

## First Login

1. Open the dashboard at http://localhost:3002
2. Click **Register** and create your account
3. A workspace is created automatically for first-time users
4. You're ready to create monitors, status pages, and configure alerts

After creating your account, you may want to disable public registration:

```sh
# In .env.docker, set:
ALLOW_PUBLIC_REGISTRATION=false
```

Then restart the stack:

```sh
docker compose up -d
```

## Configuration Reference

All configuration is done through `.env.docker`. Copy `.env.docker.example` as your starting point.

### Required

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_SECRET` | Session encryption key. Generate with `openssl rand -base64 32` | _(none, must set)_ |
| `SELF_HOST` | Must be `"true"` for self-hosted deployments | `"true"` |
| `CRON_SECRET` | Auth token for the cron scheduler | `change-me-to-a-random-string` |

### Authentication

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOW_PUBLIC_REGISTRATION` | Allow new users to register | `true` |
| `TOTP_ENCRYPTION_KEY` | Encryption key for TOTP 2FA secrets. Generate with `openssl rand -hex 32` | _(none)_ |
| `TOTP_KEY_VERSION` | Key version identifier for TOTP rotation | `v1` |
| `NEXTAUTH_URL` | Public URL for auth callbacks (set when behind a reverse proxy) | _(unset)_ |

#### WebAuthn / Passkeys

WebAuthn requires HTTPS in production. Browsers refuse passkey operations on plain HTTP. The only exception is `localhost`, where browsers allow HTTP as a development convenience (this is part of the WebAuthn spec, not a workaround).

For production behind a reverse proxy:

1. Set `NEXTAUTH_URL` to your dashboard's public HTTPS URL (e.g., `https://status.example.com`)
2. Ensure your reverse proxy terminates TLS before the dashboard
3. The relying party ID is derived automatically from the `NEXTAUTH_URL` hostname

If passkey registration or login fails, check:
- `NEXTAUTH_URL` matches the exact URL users visit (protocol, hostname, port)
- Your reverse proxy passes the `Host` and `X-Forwarded-Proto` headers correctly
- The TLS certificate is valid (self-signed certs may cause issues with some browsers)

### Internal Services

These connect services within the Docker network. Change only if you've modified the compose service names.

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | libSQL connection URL | `http://libsql:8080` |
| `CHECKER_URL` | Checker service URL | `http://checker:8080` |
| `WORKFLOWS_URL` | Workflows service URL | `http://workflows:3000` |
| `TINYBIRD_URL` | Tinybird analytics URL | `http://tinybird-local:7181` |

### Public URLs

These `NEXT_PUBLIC_*` variables are **runtime-configurable**. The Docker images are environment-agnostic, so changing these values only requires a container restart, not a rebuild.

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_URL` | Dashboard's public URL (what users see in their browser) | `http://localhost:3002` |
| `NEXT_PUBLIC_STATUS_PAGE_BASE_URL` | Status page base URL | `http://localhost:3003` |
| `NEXT_PUBLIC_SHOW_GITHUB_NAV` | Show GitHub repo link in the nav bar | `true` |
| `NEXT_PUBLIC_GITHUB_URL` | GitHub repo URL for the nav link | `https://github.com/onlystatushq/onlystatus` |
| `NEXT_PUBLIC_ALLOW_PUBLIC_REGISTRATION` | Show registration form on login page | `true` |
| `STATUS_PAGE_DOMAIN` | Optional. Enables subdomain-based status page routing (e.g., `pages.example.com` enables `mypage.pages.example.com`). Requires wildcard DNS and TLS. | `localhost` |

### Email (Optional)

Required for email notifications and alerts.

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | _(unset)_ |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | _(unset)_ |
| `SMTP_PASS` | SMTP password | _(unset)_ |
| `SMTP_FROM` | Sender email address | _(unset)_ |

### Port Overrides (Optional)

Override default ports if they conflict with other services on your host. Port overrides go in `.env` (not `.env.docker`), because Docker Compose reads `.env` for port bindings. Copy `.env.example` to `.env` and uncomment the ports you need to change.

```sh
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `LIBSQL_HTTP_PORT` | libSQL HTTP API port | `8080` |
| `LIBSQL_GRPC_PORT` | libSQL gRPC port | `5001` |
| `TINYBIRD_PORT` | Tinybird analytics port | `7181` |
| `SERVER_PORT` | API server port | `3001` |
| `DASHBOARD_PORT` | Dashboard port | `3002` |
| `STATUS_PAGE_PORT` | Status page port | `3003` |
| `CHECKER_PORT` | Checker port | `8082` |
| `PRIVATE_LOCATION_PORT` | Private location ingest port | `8081` |

## Production Deployment

For production, you need TLS termination via a reverse proxy. OnlyStatus exposes two web-facing services:

- **Dashboard** on port 3002 (or `DASHBOARD_PORT`)
- **Status Page** on port 3003 (or `STATUS_PAGE_PORT`)

Update `.env.docker` with your production URLs:

```sh
NEXT_PUBLIC_URL=https://status.example.com
NEXT_PUBLIC_STATUS_PAGE_BASE_URL=https://pages.example.com
NEXTAUTH_URL=https://status.example.com
```

Status pages are accessed by path (`pages.example.com/myapp`) or by custom domain (configured per page in the dashboard). No additional env vars are needed for this.

If you want subdomain-based routing (`myapp.pages.example.com`), also set `STATUS_PAGE_DOMAIN=pages.example.com` and configure wildcard DNS + TLS for that domain. This is optional.

Apply the production overlay for resource limits and logging:

```sh
docker compose -f docker-compose.yaml -f docker-compose.prod.yml up -d
```

### TLS with Traefik

If Traefik is already running on your host, add labels to the dashboard and status-page services. Create a `docker-compose.traefik.yml` overlay:

```yaml
networks:
  traefik_network:
    external: true

services:
  dashboard:
    networks:
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.onlystatus-dashboard.rule=Host(`status.example.com`)"
      - "traefik.http.routers.onlystatus-dashboard.entrypoints=websecure"
      - "traefik.http.routers.onlystatus-dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.services.onlystatus-dashboard.loadbalancer.server.port=3000"

  status-page:
    networks:
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.onlystatus-statuspage.rule=Host(`pages.example.com`) || HostRegexp(`^.+\\.pages\\.example\\.com$$`)"
      - "traefik.http.routers.onlystatus-statuspage.entrypoints=websecure"
      - "traefik.http.routers.onlystatus-statuspage.tls.certresolver=letsencrypt"
      - "traefik.http.routers.onlystatus-statuspage.tls.domains[0].main=pages.example.com"
      - "traefik.http.routers.onlystatus-statuspage.tls.domains[0].sans=*.pages.example.com"
      - "traefik.http.services.onlystatus-statuspage.loadbalancer.server.port=3000"
      - "traefik.docker.network=traefik_network"
```

The status-page router uses `HostRegexp` to match wildcard subdomains (e.g., `mypage.pages.example.com`). The `tls.domains` labels tell Traefik to request a wildcard certificate via your DNS challenge provider. Wildcard certs require a DNS-01 challenge, not HTTP-01. If your certresolver only supports HTTP-01, use a single `Host()` rule with `STATUS_PAGE_DOMAIN` set to the exact hostname and access status pages by path (e.g., `pages.example.com/mypage`).

Then start with all overlays:

```sh
docker compose -f docker-compose.yaml -f docker-compose.prod.yml -f docker-compose.traefik.yml up -d
```

### TLS with nginx

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name status.example.com;

    ssl_certificate     /etc/letsencrypt/live/status.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/status.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Status pages: base domain + wildcard subdomains
server {
    listen 443 ssl http2;
    server_name pages.example.com *.pages.example.com;

    ssl_certificate     /etc/letsencrypt/live/pages.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pages.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The `X-Forwarded-Host` header is required for subdomain routing. The status-page service reads it to determine which status page to serve. For wildcard subdomains, you need a wildcard certificate (use certbot with DNS challenge: `certbot certonly --dns-<provider> -d pages.example.com -d *.pages.example.com`).

### TLS with Caddy

Caddy handles TLS automatically:

```
status.example.com {
    reverse_proxy localhost:3002
}

pages.example.com, *.pages.example.com {
    reverse_proxy localhost:3003
}
```

For wildcard subdomains, Caddy needs a DNS challenge provider configured for automatic certificate issuance. See the [Caddy ACME DNS documentation](https://caddyserver.com/docs/automatic-https#dns-challenge) for setup.

### How Status Page Routing Works

Status pages can be accessed in three ways:

| Method | URL Pattern | Example |
|--------|------------|---------|
| **Path-based** | `pages.example.com/<slug>` | `pages.example.com/myapp` |
| **Subdomain** | `<slug>.pages.example.com` | `myapp.pages.example.com` |
| **Custom domain** | Any domain you own | `status.yourcompany.com` |

Path-based routing works out of the box with no extra configuration. Subdomain routing requires a wildcard DNS record (`*.pages.example.com`) and a wildcard TLS certificate (see the reverse proxy examples above). The `STATUS_PAGE_DOMAIN` env var tells the status-page service which domain to extract subdomains from.

### Custom Domains for Status Pages

To use a fully custom domain (e.g., `status.yourcompany.com`) for a specific status page:

1. **DNS**: Create a CNAME or A record pointing `status.yourcompany.com` to your OnlyStatus server
2. **Reverse proxy**: Add the custom domain to your proxy config, routing to port 3003 (or `STATUS_PAGE_PORT`). The `Host` / `X-Forwarded-Host` header must be passed through.
3. **TLS**: Ensure your reverse proxy can issue a certificate for the custom domain (via HTTP-01 challenge or DNS challenge)
4. **Dashboard**: Go to the status page settings and enter `status.yourcompany.com` in the custom domain field

The status-page service matches incoming requests against the `custom_domain` column in the database. If no match is found, it falls back to slug-based lookup. All four steps are required, as the reverse proxy must route the traffic AND the app must know which status page to serve for that domain.

**Traefik example** for adding a custom domain to an existing setup:

```yaml
# Add to your status-page router rule:
- "traefik.http.routers.onlystatus-statuspage.rule=Host(`pages.example.com`) || Host(`status.yourcompany.com`) || HostRegexp(`^.+\\.pages\\.example\\.com$$`)"
```

**nginx example**:

```nginx
# Add a new server block or extend the existing server_name:
server {
    listen 443 ssl http2;
    server_name status.yourcompany.com;

    ssl_certificate     /etc/letsencrypt/live/status.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/status.yourcompany.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Private Locations

Private locations let you deploy lightweight checker containers anywhere to monitor from multiple network vantage points.

### Creating a Location in the Dashboard

1. Go to **Settings > Private Locations** in the dashboard
2. Click **Create Location**
3. Give it a name and description (e.g., "EU Frankfurt", "US East Office")
4. Copy the generated token

### Deploying the Checker Container

Run the checker container on any Docker-capable machine:

```sh
docker run -d \
  --name onlystatus-checker \
  --restart unless-stopped \
  -e OPENSTATUS_KEY=<your-token> \
  -e OPENSTATUS_INGEST_URL=https://your-instance.com:8081 \
  ghcr.io/onlystatushq/onlystatus-private-checker:latest
```

Replace:
- `<your-token>` with the token from the dashboard
- `https://your-instance.com:8081` with the public URL of your private-location service (port 8081 by default, or your `PRIVATE_LOCATION_PORT`)

### Network Requirements

- The remote checker needs **outbound HTTPS** access to your OnlyStatus private-location endpoint
- No inbound ports are required on the checker machine
- The checker pulls work from the private-location service, executes checks, and pushes results back

### Using Private Locations in Monitors

Once the checker connects, the location appears in the dashboard. When creating or editing a monitor, select your private location(s) alongside or instead of the built-in local checker.

## Monitoring Types

OnlyStatus supports three types of synthetic checks:

### HTTP

Monitors web endpoints with configurable:
- Request method (GET, POST, HEAD, etc.)
- Expected status codes
- Request headers and body
- Response time thresholds
- TLS certificate validation

### TCP

Tests raw TCP connectivity to any host and port. Useful for monitoring:
- Database servers
- Mail servers
- Custom TCP services

### DNS

Validates DNS resolution. Checks that a domain resolves to the expected record values. Supports:
- A, AAAA, CNAME, MX, TXT, NS record types

## Upgrading

To update to the latest version:

```sh
cd onlystatus
git pull
docker compose up -d --build
```

The `--build` flag rebuilds images with the latest code. Database migrations run automatically via the `db-migrate` init container on every startup.

If using the production overlay:

```sh
docker compose -f docker-compose.yaml -f docker-compose.prod.yml up -d --build
```

### Changing URLs without rebuilding

`NEXT_PUBLIC_*` variables are injected at runtime, not baked into the image at build time. If you only need to change URLs or toggle UI settings, update `.env.docker` and restart without `--build`:

```sh
docker compose up -d
```

## Backup & Restore

### Database (libSQL)

The application database is stored in the `onlystatus-libsql-data` Docker volume.

**Backup:**

```sh
docker run --rm \
  -v onlystatus-libsql-data:/data:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/libsql-backup-$(date +%Y%m%d).tar.gz -C /data .
```

**Restore:**

```sh
docker compose down
docker run --rm \
  -v onlystatus-libsql-data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/libsql-backup-YYYYMMDD.tar.gz -C /data"
docker compose up -d
```

### Analytics (Tinybird)

Analytics data is stored in the `onlystatus-tinybird-data` volume.

**Backup:**

```sh
docker run --rm \
  -v onlystatus-tinybird-data:/data:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/tinybird-backup-$(date +%Y%m%d).tar.gz -C /data .
```

**Restore:** Same pattern as libSQL, using the `onlystatus-tinybird-data` volume name.

### Uploads

User-uploaded files (logos, favicons) are stored in the `onlystatus-uploads` volume. Back up with the same `tar` approach using volume name `onlystatus-uploads`.

### Automated Backups

For scheduled backups, add a cron job on the host:

```sh
# Daily at 2 AM
0 2 * * * cd /path/to/onlystatus && docker run --rm -v onlystatus-libsql-data:/data:ro -v /path/to/backups:/backup alpine tar czf /backup/libsql-$(date +\%Y\%m\%d).tar.gz -C /data .
```

## Troubleshooting

### Services Not Starting

Check which services are unhealthy:

```sh
docker compose ps
```

View logs for a specific service:

```sh
docker compose logs <service-name>
```

The startup chain is strict. If an upstream service fails, everything downstream stays waiting:

```
libsql (healthy) -> db-migrate (exit 0) -> workflows (healthy) -> server (healthy) -> dashboard, status-page, private-location
tinybird-local (healthy) -> tinybird-deploy (exit 0) -> checker
cron -> workflows (healthy)
```

**Common causes:**
- **libsql won't start**: Port 8080 conflict. Set `LIBSQL_HTTP_PORT` to a different port.
- **db-migrate fails**: Check that libsql is healthy first. The migrate container needs libsql running.
- **workflows/server stuck on "starting"**: Usually means db-migrate hasn't completed. Check its logs.

### Tinybird Deploy Timeout

On first startup, Tinybird initializes its workspace which can take 60+ seconds. The deploy script retries automatically (up to 60 attempts). If it still fails:

```sh
# Check tinybird-local health
docker compose logs tinybird-local

# Restart just the deploy
docker compose restart tinybird-deploy
```

The Tinybird image is `linux/amd64` only. On ARM hosts (Apple Silicon), Docker uses QEMU emulation which is significantly slower. Allow extra time for initialization.

### Dashboard Shows No Data

If the dashboard loads but shows no monitoring data:

1. **Check Tinybird token**: The auth token is generated at Tinybird startup and shared via a Docker volume. If the volume was recreated but the dashboard wasn't restarted, it may have a stale token.

   ```sh
   docker compose restart dashboard status-page
   ```

2. **Check the checker is running**: Monitoring data flows through the checker to Tinybird.

   ```sh
   docker compose ps checker
   docker compose logs checker
   ```

3. **Check cron is triggering**: The cron container dispatches checks on schedule.

   ```sh
   docker compose logs cron
   ```

### Private Location Not Connecting

If a remote checker doesn't appear in the dashboard:

1. **Verify the ingest URL**: The `OPENSTATUS_INGEST_URL` must point to the private-location service's public endpoint (port 8081 by default), not the main server.

2. **Check network access**: The remote checker must be able to reach your private-location endpoint over HTTPS.

   ```sh
   # From the checker machine
   curl -v https://your-instance.com:8081/health
   ```

3. **Verify the token**: The `OPENSTATUS_KEY` must match the token generated in the dashboard under Private Locations.

4. **Check private-location logs**:

   ```sh
   docker compose logs private-location
   ```

### Port Conflicts

If services fail to bind their ports, another process is using them. Either stop the conflicting process or set port overrides in `.env` (copy from `.env.example`):

```sh
LIBSQL_HTTP_PORT=18080
DASHBOARD_PORT=13002
STATUS_PAGE_PORT=13003
```

### Complete Reset

To start completely fresh (removes all data):

```sh
docker compose down -v
docker compose up -d --build
```

The `-v` flag removes all named volumes, wiping the database, analytics, and uploads.
