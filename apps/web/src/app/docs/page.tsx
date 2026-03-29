import type { Metadata } from "next";
import Link from "next/link";
import { Terminal } from "@/components/terminal";
import { ChevronLeft, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Deployment Guide - OnlyStatus",
  description:
    "Complete guide for deploying OnlyStatus. Quick start, production setup, reverse proxy configuration, and more.",
};

const toc = [
  { id: "quick-start", label: "Quick Start" },
  { id: "first-login", label: "First Login" },
  { id: "production", label: "Production" },
  { id: "reverse-proxy", label: "Reverse Proxy" },
  { id: "status-pages", label: "Status Pages" },
  { id: "custom-domains", label: "Custom Domains" },
  { id: "private-locations", label: "Private Locations" },
  { id: "configuration", label: "Configuration" },
];

const configVars: {
  name: string;
  desc: string;
  default?: string;
  required?: boolean;
  group: string;
}[] = [
  {
    name: "AUTH_SECRET",
    desc: "Session encryption key",
    required: true,
    group: "Required",
  },
  {
    name: "CRON_SECRET",
    desc: "Auth token for cron scheduler",
    required: true,
    group: "Required",
  },
  {
    name: "NEXT_PUBLIC_URL",
    desc: "Dashboard's public URL (runtime, no rebuild needed)",
    default: "http://localhost:3002",
    group: "Public URLs",
  },
  {
    name: "NEXT_PUBLIC_STATUS_PAGE_BASE_URL",
    desc: "Status page base URL (runtime, no rebuild needed)",
    default: "http://localhost:3003",
    group: "Public URLs",
  },
  {
    name: "NEXT_PUBLIC_SHOW_GITHUB_NAV",
    desc: "Show GitHub link in nav (runtime)",
    default: "true",
    group: "Public URLs",
  },
  {
    name: "NEXT_PUBLIC_GITHUB_URL",
    desc: "GitHub repo URL for nav link (runtime)",
    default: "https://github.com/onlystatushq/onlystatus",
    group: "Public URLs",
  },
  {
    name: "NEXT_PUBLIC_ALLOW_PUBLIC_REGISTRATION",
    desc: "Show registration form (runtime)",
    default: "true",
    group: "Public URLs",
  },
  {
    name: "STATUS_PAGE_DOMAIN",
    desc: "Optional. Enables subdomain routing (e.g., mypage.pages.example.com). Requires wildcard DNS + TLS.",
    default: "localhost",
    group: "Public URLs",
  },
  {
    name: "NEXTAUTH_URL",
    desc: "Auth callback URL (set when behind reverse proxy)",
    group: "Public URLs",
  },
  {
    name: "ALLOW_PUBLIC_REGISTRATION",
    desc: "Allow new users to register",
    default: "true",
    group: "Auth",
  },
  {
    name: "TOTP_ENCRYPTION_KEY",
    desc: "Encryption key for TOTP 2FA secrets",
    group: "Auth",
  },
  {
    name: "SMTP_HOST",
    desc: "SMTP server hostname",
    group: "Email",
  },
  {
    name: "SMTP_PORT",
    desc: "SMTP server port",
    default: "587",
    group: "Email",
  },
  {
    name: "SMTP_USER",
    desc: "SMTP username",
    group: "Email",
  },
  {
    name: "SMTP_PASS",
    desc: "SMTP password",
    group: "Email",
  },
  {
    name: "SMTP_FROM",
    desc: "Sender email address",
    group: "Email",
  },
  {
    name: "DASHBOARD_PORT",
    desc: "Dashboard host port",
    default: "3002",
    group: "Ports",
  },
  {
    name: "STATUS_PAGE_PORT",
    desc: "Status page host port",
    default: "3003",
    group: "Ports",
  },
  {
    name: "SERVER_PORT",
    desc: "API server host port",
    default: "3001",
    group: "Ports",
  },
  {
    name: "CHECKER_PORT",
    desc: "Checker host port",
    default: "8082",
    group: "Ports",
  },
  {
    name: "PRIVATE_LOCATION_PORT",
    desc: "Private location ingest port",
    default: "8081",
    group: "Ports",
  },
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-[family-name:var(--font-commit-mono)] text-xs text-foreground">
      {children}
    </code>
  );
}

export default function DocsPage() {
  const groups = [...new Set(configVars.map((v) => v.group))];

  return (
    <main className="px-6 pt-24 pb-24">
      <div className="mx-auto max-w-4xl">
        {/* Back */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
          Home
        </Link>

        {/* Title */}
        <h1 className="mb-3 font-cal text-4xl tracking-tight sm:text-5xl">
          Deployment Guide
        </h1>
        <p className="mb-10 max-w-xl text-lg text-muted-foreground">
          Everything you need to deploy, configure, and run OnlyStatus in
          production.
        </p>

        {/* TOC */}
        <nav className="mb-16 rounded-lg border border-border bg-card p-4">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            On this page
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* ── Quick Start ────────────────────────────────────────────── */}
        <section id="quick-start" className="scroll-mt-20 mb-16">
          <h2 className="mb-4 font-cal text-2xl tracking-tight sm:text-3xl">
            Quick Start
          </h2>
          <p className="mb-2 text-sm text-muted-foreground leading-relaxed">
            Two commands to get running. Requires Docker 24.0+ with Compose
            v2, at least 2 GB RAM, and x86_64 architecture.
          </p>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            Tinybird analytics does not support ARM natively. Apple Silicon
            users need Rosetta or QEMU emulation.
          </p>

          <div className="mb-6">
            <Terminal
              title="quick start"
              glow
              commands={[
                "git clone https://github.com/onlystatushq/onlystatus.git && cd onlystatus",
                "./setup.sh && docker compose up -d",
              ]}
            />
          </div>

          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
            The <Code>setup.sh</Code> script generates{" "}
            <Code>.env.docker</Code> with random secrets. First startup takes a
            few minutes while Docker builds images and initializes databases.
            Images are environment-agnostic: <Code>NEXT_PUBLIC_*</Code>{" "}
            variables are injected at runtime, so you can change URLs without
            rebuilding. Monitor progress:
          </p>
          <div className="mb-6">
            <Terminal
              commands={["docker compose ps", "docker compose logs -f"]}
            />
          </div>

          <div className="rounded-lg border border-success/20 bg-success/[0.03] p-4">
            <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Ready
            </span>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex size-1.5 rounded-full bg-success shadow-[0_0_6px_oklch(0.72_0.19_150/0.5)]" />
                <Code>localhost:3002</Code>
                <span className="text-xs text-muted-foreground">Dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex size-1.5 rounded-full bg-success shadow-[0_0_6px_oklch(0.72_0.19_150/0.5)]" />
                <Code>localhost:3003</Code>
                <span className="text-xs text-muted-foreground">
                  Status Pages
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── First Login ────────────────────────────────────────────── */}
        <section id="first-login" className="scroll-mt-20 mb-16">
          <h2 className="mb-4 font-cal text-2xl tracking-tight sm:text-3xl">
            First Login
          </h2>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Open the dashboard at{" "}
              <Code>http://localhost:3002</Code> and click{" "}
              <strong className="text-foreground">Register</strong>. A workspace
              is created automatically for first-time users.
            </p>
            <p>
              After creating your account, disable public registration to
              prevent unauthorized signups:
            </p>
          </div>
          <div className="mt-4">
            <Terminal
              title=".env.docker"
              shell={false}
              commands={["ALLOW_PUBLIC_REGISTRATION=false"]}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Then restart: <Code>docker compose up -d</Code>
          </p>
        </section>

        {/* ── Production ─────────────────────────────────────────────── */}
        <section id="production" className="scroll-mt-20 mb-16">
          <h2 className="mb-4 font-cal text-2xl tracking-tight sm:text-3xl">
            Production
          </h2>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            For production, you need TLS termination via a reverse proxy.
            OnlyStatus exposes two web-facing services: the dashboard (port
            3002) and the status page (port 3003).
          </p>
          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
            Update <Code>.env.docker</Code> with your production URLs:
          </p>
          <div className="mb-6">
            <Terminal
              title=".env.docker"
              shell={false}
              commands={[
                "NEXT_PUBLIC_URL=https://status.example.com",
                "NEXT_PUBLIC_STATUS_PAGE_BASE_URL=https://pages.example.com",
                "NEXTAUTH_URL=https://status.example.com",
              ]}
            />
          </div>
          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
            Status pages are accessed by path (
            <Code>pages.example.com/myapp</Code>) or by custom domain
            (configured per page in the dashboard). No extra env vars needed.
            For subdomain routing (<Code>myapp.pages.example.com</Code>),
            optionally set <Code>STATUS_PAGE_DOMAIN=pages.example.com</Code>{" "}
            and configure wildcard DNS + TLS.
          </p>
          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
            Apply the production overlay for resource limits and log rotation:
          </p>
          <Terminal
            commands={[
              "docker compose -f docker-compose.yaml -f docker-compose.prod.yml up -d",
            ]}
          />
          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              WebAuthn / Passkeys
            </span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Passkey login requires HTTPS in production. Browsers refuse
              WebAuthn on plain HTTP (<Code>localhost</Code> is the only
              exception, allowed by the spec for development). Set{" "}
              <Code>NEXTAUTH_URL</Code> to your dashboard&apos;s public HTTPS
              URL and ensure your reverse proxy passes <Code>Host</Code> and{" "}
              <Code>X-Forwarded-Proto</Code> headers correctly.
            </p>
          </div>
        </section>

        {/* ── Reverse Proxy ──────────────────────────────────────────── */}
        <section id="reverse-proxy" className="scroll-mt-20 mb-16">
          <h2 className="mb-6 font-cal text-2xl tracking-tight sm:text-3xl">
            Reverse Proxy
          </h2>

          {/* Traefik */}
          <div className="mb-10">
            <h3 className="mb-3 text-base font-semibold">Traefik</h3>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              If Traefik is already running on your host, create a{" "}
              <Code>docker-compose.traefik.yml</Code> overlay:
            </p>
            <div className="mb-4">
              <Terminal
                title="docker-compose.traefik.yml"
                shell={false}
                commands={[
                  "networks:",
                  "  traefik_network:",
                  "    external: true",
                  "",
                  "services:",
                  "  dashboard:",
                  "    networks:",
                  "      - traefik_network",
                  "    labels:",
                  '      - "traefik.enable=true"',
                  '      - "traefik.http.routers.onlystatus-dashboard.rule=Host(`status.example.com`)"',
                  '      - "traefik.http.routers.onlystatus-dashboard.entrypoints=websecure"',
                  '      - "traefik.http.routers.onlystatus-dashboard.tls.certresolver=letsencrypt"',
                  '      - "traefik.http.services.onlystatus-dashboard.loadbalancer.server.port=3000"',
                  "",
                  "  status-page:",
                  "    networks:",
                  "      - traefik_network",
                  "    labels:",
                  '      - "traefik.enable=true"',
                  "      - \"traefik.http.routers.onlystatus-statuspage.rule=Host(`pages.example.com`) || HostRegexp(`^.+\\\\.pages\\\\.example\\\\.com$$`)\"",
                  '      - "traefik.http.routers.onlystatus-statuspage.entrypoints=websecure"',
                  '      - "traefik.http.routers.onlystatus-statuspage.tls.certresolver=letsencrypt"',
                  '      - "traefik.http.routers.onlystatus-statuspage.tls.domains[0].main=pages.example.com"',
                  '      - "traefik.http.routers.onlystatus-statuspage.tls.domains[0].sans=*.pages.example.com"',
                  '      - "traefik.http.services.onlystatus-statuspage.loadbalancer.server.port=3000"',
                  '      - "traefik.docker.network=traefik_network"',
                ]}
              />
            </div>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              The <Code>HostRegexp</Code> matches wildcard subdomains. The{" "}
              <Code>tls.domains</Code> labels request a wildcard certificate via
              DNS-01 challenge. If your certresolver only supports HTTP-01, skip
              the wildcard and use path-based routing instead (
              <Code>pages.example.com/mypage</Code>).
            </p>
            <Terminal
              commands={[
                "docker compose -f docker-compose.yaml -f docker-compose.prod.yml -f docker-compose.traefik.yml up -d",
              ]}
            />
          </div>

          {/* nginx */}
          <div className="mb-10">
            <h3 className="mb-3 text-base font-semibold">nginx</h3>
            <Terminal
              title="nginx.conf"
              shell={false}
              commands={[
                "server {",
                "    listen 443 ssl http2;",
                "    server_name status.example.com;",
                "",
                "    ssl_certificate     /etc/letsencrypt/live/status.example.com/fullchain.pem;",
                "    ssl_certificate_key /etc/letsencrypt/live/status.example.com/privkey.pem;",
                "",
                "    location / {",
                "        proxy_pass http://127.0.0.1:3002;",
                "        proxy_set_header Host $host;",
                "        proxy_set_header X-Real-IP $remote_addr;",
                "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
                "        proxy_set_header X-Forwarded-Proto $scheme;",
                "    }",
                "}",
                "",
                "server {",
                "    listen 443 ssl http2;",
                "    server_name pages.example.com *.pages.example.com;",
                "",
                "    ssl_certificate     /etc/letsencrypt/live/pages.example.com/fullchain.pem;",
                "    ssl_certificate_key /etc/letsencrypt/live/pages.example.com/privkey.pem;",
                "",
                "    location / {",
                "        proxy_pass http://127.0.0.1:3003;",
                "        proxy_set_header Host $host;",
                "        proxy_set_header X-Forwarded-Host $host;",
                "        proxy_set_header X-Real-IP $remote_addr;",
                "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
                "        proxy_set_header X-Forwarded-Proto $scheme;",
                "    }",
                "}",
              ]}
            />
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              The <Code>X-Forwarded-Host</Code> header is required for subdomain
              routing. For wildcard certs, use certbot with DNS challenge:{" "}
              <Code>
                certbot certonly --dns-&lt;provider&gt; -d pages.example.com -d
                *.pages.example.com
              </Code>
            </p>
          </div>

          {/* Caddy */}
          <div>
            <h3 className="mb-3 text-base font-semibold">Caddy</h3>
            <Terminal
              title="Caddyfile"
              shell={false}
              commands={[
                "status.example.com {",
                "    reverse_proxy localhost:3002",
                "}",
                "",
                "pages.example.com, *.pages.example.com {",
                "    reverse_proxy localhost:3003",
                "}",
              ]}
            />
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Caddy handles TLS automatically. Wildcard subdomains require a DNS
              challenge provider. See the{" "}
              <a
                href="https://caddyserver.com/docs/automatic-https#dns-challenge"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 transition-colors hover:text-foreground"
              >
                Caddy ACME DNS docs
              </a>
              .
            </p>
          </div>
        </section>

        {/* ── Status Pages ───────────────────────────────────────────── */}
        <section id="status-pages" className="scroll-mt-20 mb-16">
          <h2 className="mb-4 font-cal text-2xl tracking-tight sm:text-3xl">
            Status Page Routing
          </h2>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            Status pages can be accessed in three ways. Path-based works out of
            the box. Subdomain routing requires wildcard DNS and TLS.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="px-4 py-2.5 text-left font-mono text-xs font-normal text-muted-foreground">
                    Method
                  </th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs font-normal text-muted-foreground">
                    Pattern
                  </th>
                  <th className="px-4 py-2.5 text-left font-mono text-xs font-normal text-muted-foreground">
                    Example
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    method: "Path-based",
                    pattern: "pages.example.com/<slug>",
                    example: "pages.example.com/myapp",
                  },
                  {
                    method: "Subdomain",
                    pattern: "<slug>.pages.example.com",
                    example: "myapp.pages.example.com",
                  },
                  {
                    method: "Custom domain",
                    pattern: "Any domain",
                    example: "status.yourcompany.com",
                  },
                ].map((row) => (
                  <tr
                    key={row.method}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {row.method}
                    </td>
                    <td className="px-4 py-2.5 font-[family-name:var(--font-commit-mono)] text-xs text-muted-foreground">
                      {row.pattern}
                    </td>
                    <td className="px-4 py-2.5 font-[family-name:var(--font-commit-mono)] text-xs text-foreground">
                      {row.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Custom Domains ─────────────────────────────────────────── */}
        <section id="custom-domains" className="scroll-mt-20 mb-16">
          <h2 className="mb-4 font-cal text-2xl tracking-tight sm:text-3xl">
            Custom Domains
          </h2>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            Use a fully custom domain like{" "}
            <Code>status.yourcompany.com</Code> for a specific status page.
            Four steps are required, as the reverse proxy must route the traffic
            and the app must know which page to serve.
          </p>
          <div className="space-y-4">
            {[
              {
                n: 1,
                title: "DNS",
                desc: "Create a CNAME or A record pointing your custom domain to the OnlyStatus server.",
              },
              {
                n: 2,
                title: "Reverse proxy",
                desc: "Add the domain to your proxy config, routing to port 3003. Pass the Host/X-Forwarded-Host header through.",
              },
              {
                n: 3,
                title: "TLS",
                desc: "Ensure your proxy can issue a certificate for the custom domain (HTTP-01 or DNS-01 challenge).",
              },
              {
                n: 4,
                title: "Dashboard",
                desc: "Go to the status page settings in the dashboard and enter the custom domain.",
              },
            ].map((step) => (
              <div
                key={step.n}
                className="flex gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border font-mono text-xs font-bold text-muted-foreground">
                  {step.n}
                </div>
                <div>
                  <span className="text-sm font-semibold">
                    {step.title}
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            The status-page service matches incoming requests against the{" "}
            <Code>custom_domain</Code> field in the database. If no match is
            found, it falls back to slug-based lookup.
          </p>
        </section>

        {/* ── Private Locations ──────────────────────────────────────── */}
        <section id="private-locations" className="scroll-mt-20 mb-16">
          <h2 className="mb-4 font-cal text-2xl tracking-tight sm:text-3xl">
            Private Locations
          </h2>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            Deploy lightweight checker containers to any network for distributed
            monitoring. No inbound ports needed. The checker pulls work and
            pushes results over HTTPS.
          </p>

          <div className="mb-6 space-y-3">
            {[
              "Create a location in Settings > Private Locations and copy the token",
              "Deploy the checker container on any Docker-capable machine",
              "Select the location when creating or editing a monitor",
            ].map((step, i) => (
              <div
                key={step}
                className="flex items-start gap-2.5 text-sm text-muted-foreground"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[10px]">
                  {i + 1}
                </span>
                <span className="text-xs leading-relaxed">{step}</span>
              </div>
            ))}
          </div>

          <Terminal
            title="remote checker"
            glow
            commands={[
              "docker run -d \\",
              "  --name onlystatus-checker \\",
              "  --restart unless-stopped \\",
              "  -e OPENSTATUS_KEY=<your-token> \\",
              "  -e OPENSTATUS_INGEST_URL=https://your-instance.com:8081 \\",
              "  ghcr.io/onlystatushq/onlystatus-checker:latest",
            ]}
          />
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Replace <Code>&lt;your-token&gt;</Code> with the token from the
            dashboard and the ingest URL with the public endpoint of your
            private-location service (port 8081 by default).
          </p>
        </section>

        {/* ── Configuration ──────────────────────────────────────────── */}
        <section id="configuration" className="scroll-mt-20 mb-16">
          <h2 className="mb-4 font-cal text-2xl tracking-tight sm:text-3xl">
            Configuration Reference
          </h2>
          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
            All settings live in <Code>.env.docker</Code>. Copy{" "}
            <Code>.env.docker.example</Code> as your starting point.
          </p>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            <Code>NEXT_PUBLIC_*</Code> variables are runtime-configurable.
            Changing them only requires a container restart (
            <Code>docker compose up -d</Code>), not an image rebuild.
          </p>

          {groups.map((group) => (
            <div key={group} className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {group}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {configVars
                      .filter((v) => v.group === group)
                      .map((v) => (
                        <tr
                          key={v.name}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-4 py-2.5 font-[family-name:var(--font-commit-mono)] text-[13px] text-foreground whitespace-nowrap">
                            {v.name}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {v.desc}
                          </td>
                          <td className="hidden px-4 py-2.5 text-right sm:table-cell whitespace-nowrap">
                            {v.required ? (
                              <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-mono text-[10px] text-warning">
                                required
                              </span>
                            ) : v.default ? (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {v.default}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        {/* ── Further Reading ────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-card/50 p-6">
            <h3 className="mb-3 text-sm font-semibold">
              More in the full guide
            </h3>
            <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
              Backup and restore, upgrading, troubleshooting, and startup chain
              details are covered in the repository&apos;s deployment guide.
            </p>
            <a
              href="https://github.com/onlystatushq/onlystatus/blob/main/docs/DEPLOYMENT.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-foreground underline underline-offset-4 transition-colors hover:text-success"
            >
              View DEPLOYMENT.md
              <ExternalLink className="size-3" />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
