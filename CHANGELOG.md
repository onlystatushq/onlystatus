# Changelog

Changes from the upstream [OpenStatus](https://github.com/openstatusHQ/openstatus) project.

## Authentication

- Replaced magic-link authentication (required Resend API) with credentials-based login
- Added TOTP two-factor authentication with encrypted secrets and recovery codes
- Added WebAuthn/FIDO2 passkey support for passwordless login
- Added security settings page for managing 2FA and passkeys
- Removed Resend dependency entirely

## Cloud Service Removal

| Before (OpenStatus) | After (OnlyStatus) |
|----------------------|---------------------|
| Vercel Blob (file uploads) | Local filesystem with content-hashed storage |
| GCP Cloud Tasks (job dispatch) | Direct HTTP to local services |
| Resend (email) | SMTP via nodemailer |
| Stripe (billing) | Removed, all features unlocked |
| Fly.io regions | Local checker + private locations |
| OpenPanel/Plausible analytics | Removed |
| Sentry error tracking | Removed |

## Plan and Feature Gating

- Removed all plan-based feature restrictions
- All workspaces default to full access (unlimited monitors, all periodicities, private locations, custom domains)
- Removed Stripe billing integration

## Docker Self-Hosting

- Single `docker-compose.yaml` runs the entire stack with no external dependencies
- Automated database migrations via drizzle-orm
- Tinybird analytics runs locally (no cloud account needed)
- Setup script (`setup.sh`) generates secrets automatically
- Port overrides via `.env` for conflict resolution
- Production overlay (`docker-compose.prod.yml`) for resource limits and log rotation
- Development overlay (`docker-compose.dev.yml`) with hot reload

## Private Locations

- Private checker published to Docker Hub (`ghcr.io/onlystatushq/onlystatus-checker`)
- Lightweight Go binary, pull-based architecture (no inbound ports needed)
- Dashboard UI for creating locations and managing tokens

## Status Page Routing

- Configurable status page URLs via `NEXT_PUBLIC_STATUS_PAGE_BASE_URL`
- Path-based routing works out of the box (`pages.example.com/myapp`)
- Optional subdomain routing via `STATUS_PAGE_DOMAIN`
- Custom domain support per status page (configured in dashboard)
- Removed hardcoded `openstatus.dev` domain references

## Branding

- Rebranded from OpenStatus to OnlyStatus
- New marketing site at onlystatus.dev
- Updated all internal references and metadata

## Infrastructure

- Pinned Docker base images (libsql v0.24.33, alpine 3.21) for reproducible builds
- Fixed Next.js 16 + TypeScript 5.9 build compatibility (fetch type cast)
- Added `drizzle-orm` to `serverExternalPackages` for standalone builds
- Fixed status page proxy middleware to not require database lookup on root URL
