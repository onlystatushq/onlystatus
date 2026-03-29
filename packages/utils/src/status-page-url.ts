import { getEnv } from "./env";

function getBaseUrl(): string {
  return getEnv("NEXT_PUBLIC_STATUS_PAGE_BASE_URL") || "http://localhost:3003";
}

/**
 * Build the public URL for a status page.
 * Prefers custom domain, falls back to path-based routing on the configured base URL.
 */
export function getStatusPageUrl(
  slug: string,
  customDomain?: string | null,
): string {
  if (customDomain) return `https://${customDomain}`;
  return `${getBaseUrl()}/${slug}`;
}

/**
 * Return the hostname (with port if present) from the status page base URL.
 * Used for display in the dashboard (e.g., slug input trailing text).
 */
export function getStatusPageHost(): string {
  try {
    return new URL(getBaseUrl()).host;
  } catch {
    return "localhost:3003";
  }
}
