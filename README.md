<p align="center">
  <img src="apps/dashboard/public/icon.png" alt="OnlyStatus" width="64" height="64" />
  <h3 align="center">OnlyStatus</h3>
  <p align="center">Self-hosted synthetic monitoring. No cloud dependencies. No restrictions.</p>
  <p align="center">
    <a href="https://onlystatus.dev">Website</a>
    ·
    <a href="#getting-started">Getting Started</a>
    ·
    <a href="https://github.com/neoyubi/onlystatus/issues">Issues</a>
  </p>
</p>

## Overview

OnlyStatus is a fully self-hosted synthetic monitoring platform. Monitor your websites and APIs with HTTP, TCP, and DNS checks, get alerts when things break, and give your users a clean status page.

It's a fork of [OpenStatus](https://github.com/openstatusHQ/openstatus).

## Why fork OpenStatus?

OpenStatus is a great project with an active team and solid engineering. Its architecture integrates with specific cloud services: Vercel Blob, GCP Cloud Tasks, Resend, Fly.io, and Stripe. That's a reasonable design for a managed product.

I wanted something different. A clean, isolated stack where every component is self-contained and nothing requires an external account. Not because the integrations are broken, but because I think a monitoring tool should be able to run on its own, with no vendor dependencies. That's the idea behind the name: OnlyStatus. Only what you need, nothing else.

- **Cloud services replaced.** Vercel Blob, GCP Cloud Tasks, Resend, Fly.io regions, Stripe billing. Each swapped for a local alternative that runs inside the same compose stack.
- **Feature gates removed.** The self-hosted version inherited plan restrictions from the hosted product (periodicity limits, monitor caps, private locations gated behind tiers). All features are now unlocked.
- **Standalone auth.** Magic-link authentication depended on a Resend API key. Replaced with credentials, TOTP 2FA, and WebAuthn passkeys.

## What changed

Here's what was replaced to make the stack fully self-contained:

| Before (OpenStatus) | After (OnlyStatus) |
|----------------------|---------------------|
| Vercel Blob (file uploads) | Local filesystem with content-hashed storage |
| GCP Cloud Tasks (job dispatch) | Direct HTTP to local services |
| Resend (email) | SMTP via nodemailer |
| Stripe (billing) | Removed entirely, all features unlocked |
| Fly.io regions | Local checker + private locations |
| Magic-link auth | Credentials + TOTP 2FA + WebAuthn passkeys |
| OpenPanel/Plausible analytics | Removed |
| Sentry | Removed |
| Plan-based feature gating | All workspaces default to full access |

See the [full commit history](https://github.com/neoyubi/onlystatus/commits/main) for details.

## Features

- **Multi-protocol monitoring** - HTTP, TCP, and DNS checks
- **Status pages** - Public status pages with custom domains and themes
- **Alerts** - Email, Slack, Discord, PagerDuty, OpsGenie, and more
- **Private locations** - Deploy lightweight checkers anywhere for distributed monitoring
- **Proper auth** - Password login, TOTP two-factor, WebAuthn/passkey support
- **Incidents and maintenance** - Track and communicate downtime
- **Full API** - REST and RPC endpoints for automation
- **Single compose file** - Everything runs in Docker, fully self-contained

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend                                           │
│  ┌──────────────┐          ┌──────────────┐         │
│  │  Dashboard   │          │ Status Page  │         │
│  │  (Next.js)   │          │  (Next.js)   │         │
│  └──────┬───────┘          └──────┬───────┘         │
├─────────┼─────────────────────────┼─────────────────┤
│  Backend│                         │                 │
│  ┌──────┴───────┐  ┌───────────┐  │                 │
│  │  API Server  │  │ Workflows │  │                 │
│  │   (Hono)     │  │  (Hono)   │  │                 │
│  └──────┬───────┘  └─────┬─────┘  │                 │
│         │                │        │                 │
│         │          ┌─────┴─────┐  │                 │
│         │          │  Checker  │  │                 │
│         │          │   (Go)    │  │                 │
├─────────┼──────────┼──────┬────┼──┼─────────────────┤
│  Data   │          │      │    │  │                 │
│  ┌──────┴───────┐  │  ┌───┴────┴──┴──┐              │
│  │   libSQL     │  │  │   Tinybird   │              │
│  │  (Database)  │  │  │  (Analytics) │              │
│  └──────────────┘  │  └──────────────┘              │
│                    │                                │
│  ┌─────────────────┴──┐                             │
│  │  Private Location  │◄── Remote Checkers (Go)     │
│  │       (Go)         │    deployed anywhere        │
│  └────────────────────┘                             │
└─────────────────────────────────────────────────────┘
```

## Getting Started

### Requirements

- Docker and Docker Compose

### Quick Start

```sh
# Clone the repo
git clone https://github.com/neoyubi/onlystatus.git
cd onlystatus

# Configure environment
cp .env.docker.example .env.docker

# Start everything
docker compose up -d
```

Once running:
- **Dashboard**: http://localhost:3002
- **Status Pages**: http://localhost:3003

Register an account at the dashboard login page. First user gets a workspace automatically.

For production, put the stack behind a reverse proxy (Traefik, nginx, Caddy) with TLS.

### Configuration

Edit `.env.docker` before starting. The essentials:

```bash
# Auth (generate a random string)
AUTH_SECRET=your-secret-here

# Email (for notifications, optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass
SMTP_FROM=alerts@example.com
```

See [.env.docker.example](.env.docker.example) for all available options.

### Creating Monitors

1. Log into the dashboard
2. Create a monitor with a URL and check frequency
3. Set region to "Local Checker" (built-in) or add private locations for distributed checks
4. Configure notifications (email, Slack, Discord, etc.)

### Private Locations

Deploy lightweight checkers to additional locations for distributed monitoring:

1. Go to **Private Locations** in the dashboard
2. Create a location and copy the token
3. Deploy the checker container wherever you want:

```sh
docker run -d \
  -e OPENSTATUS_KEY=<your-token> \
  -e OPENSTATUS_INGEST_URL=https://your-instance.com \
  neoyubi/onlystatus-checker:latest
```

The checker only needs outbound access to your OnlyStatus instance. No inbound ports required.


## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui, tRPC
- **API**: Hono (Node.js)
- **Checker**: Go
- **Database**: libSQL (Turso)
- **Analytics**: Tinybird (local)
- **Auth**: NextAuth.js with credentials, TOTP, WebAuthn
- **ORM**: Drizzle

## Development

```sh
# Install dependencies
pnpm install

# Run database locally
turso dev --db-file dev.db

# Start dev servers
pnpm dev:dashboard
pnpm dev:status-page
pnpm dev:web          # Landing page
```

## Contributing

Contributions welcome. Check the [open issues](https://github.com/neoyubi/onlystatus/issues) or submit a PR.

## Credits

OnlyStatus is a fork of [OpenStatus](https://github.com/openstatusHQ/openstatus), built by Thibault Le Ouay Ducroquet, Maximilian Kaske, and contributors. The original project is excellent software and active development continues there. This fork diverges to provide a fully self-hosted experience without cloud dependencies or usage-tier restrictions. If a hosted solution works for you, consider [OpenStatus Cloud](https://www.openstatus.dev/) directly.

## License

AGPL-3.0 - see [LICENSE](LICENSE) for details.
