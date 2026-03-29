import { NextResponse } from "next/server";

const ENV_KEYS = [
  "NEXT_PUBLIC_URL",
  "NEXT_PUBLIC_STATUS_PAGE_BASE_URL",
  "NEXT_PUBLIC_ALLOW_PUBLIC_REGISTRATION",
  "NEXT_PUBLIC_SHOW_GITHUB_NAV",
  "NEXT_PUBLIC_GITHUB_URL",
] as const;

export async function GET() {
  const env: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) {
    env[key] = process.env[key];
  }

  const script = `window.__ENV = ${JSON.stringify(env)};`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
