type EnvKey =
  | "NEXT_PUBLIC_URL"
  | "NEXT_PUBLIC_STATUS_PAGE_BASE_URL"
  | "NEXT_PUBLIC_ALLOW_PUBLIC_REGISTRATION"
  | "NEXT_PUBLIC_SHOW_GITHUB_NAV"
  | "NEXT_PUBLIC_GITHUB_URL";

/**
 * Get a public env var at runtime.
 * Server: reads process.env directly.
 * Client: reads from window.__ENV (injected via /api/__env), falls back to process.env.
 */
export function getEnv(key: EnvKey): string | undefined {
  if (typeof window !== "undefined" && window.__ENV) {
    return window.__ENV[key];
  }
  return process.env[key];
}

declare global {
  interface Window {
    __ENV?: Record<string, string | undefined>;
  }
}
