import type { NextRequest } from "next/server";

const STATUS_PAGE_DOMAIN =
  process.env.STATUS_PAGE_DOMAIN ?? "localhost";

export const getValidSubdomain = (host?: string | null) => {
  let subdomain: string | null = null;
  if (!host && typeof window !== "undefined") {
    // On client side, get the host from window
    // biome-ignore lint: to fix later
    host = window.location.host;
  }

  // Exclude localhost and IP addresses from being treated as subdomains
  if (host?.match(/^(localhost|127\.0\.0\.1|::1|\d+\.\d+\.\d+\.\d+)/)) {
    return null;
  }

  // Handle subdomains of localhost (e.g., hello.localhost:3000)
  if (host?.match(/^([^.]+)\.localhost(:\d+)?$/)) {
    const match = host.match(/^([^.]+)\.localhost(:\d+)?$/);
    return match?.[1] || null;
  }

  // Strip port for domain matching
  const hostWithoutPort = host?.replace(/:\d+$/, "") ?? "";

  // If host is a subdomain of STATUS_PAGE_DOMAIN (e.g., myapp.status.example.com -> myapp)
  if (hostWithoutPort.endsWith(`.${STATUS_PAGE_DOMAIN}`)) {
    const sub = hostWithoutPort.slice(
      0,
      hostWithoutPort.length - STATUS_PAGE_DOMAIN.length - 1,
    );
    return sub || null;
  }

  // If host IS the STATUS_PAGE_DOMAIN exactly, no subdomain
  if (hostWithoutPort === STATUS_PAGE_DOMAIN) {
    return null;
  }

  // Known SaaS domains: extract subdomain
  if (host?.includes(".") && !host.includes(".vercel.app")) {
    const candidate = host.split(".")[0];
    if (candidate && !candidate.includes("www")) {
      subdomain = candidate;
    }
  }

  if (
    host &&
    (host.includes("stpg.dev") ||
      host.includes("openstatus.dev") ||
      host.endsWith(".vercel.app"))
  ) {
    return subdomain;
  }

  // Unknown domain = custom domain, return the full host for DB lookup
  if (host) {
    subdomain = host.replace(/:\d+$/, "");
  }
  return subdomain;
};

export const getValidCustomDomain = (req: NextRequest | Request) => {
  const url = "nextUrl" in req ? req.nextUrl.clone() : new URL(req.url);
  const headers = req.headers;
  const host = headers.get("x-forwarded-host");

  let prefix = "";
  let type: "hostname" | "pathname";

  const hostnames = host?.split(/[.:]/) ?? url.host.split(/[.:]/);
  const pathnames = url.pathname.split("/");

  const subdomain = getValidSubdomain(host ?? url.host);

  if (
    hostnames.length > 2 &&
    hostnames[0] !== "www" &&
    !url.host.endsWith(".vercel.app")
  ) {
    prefix = hostnames[0].toLowerCase();
    type = "hostname";
  } else {
    prefix = pathnames[1]?.toLowerCase() ?? "";
    type = "pathname";
  }

  if (subdomain !== null) {
    prefix = subdomain.toLowerCase();
  }

  return { type, prefix };
};
