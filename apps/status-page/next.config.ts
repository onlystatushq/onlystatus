import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.SELF_HOST === "true" ? "standalone" : undefined,
  serverExternalPackages: ["argon2", "nodemailer"],
  experimental: {
    authInterrupts: true,
  },
  images: {
    remotePatterns: [
      new URL("https://**.public.blob.vercel-storage.com/**"),
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [
            {
              type: "host",
              value: `(?<subdomain>[^.]+).${process.env.STATUS_PAGE_DOMAIN ?? "localhost"}`,
            },
          ],
          missing: [
            {
              type: "header",
              key: "x-proxy",
              value: "1",
            },
            {
              type: "host",
              value: process.env.STATUS_PAGE_DOMAIN ?? "localhost",
            },
          ],
          destination: "/:subdomain",
        },
        {
          source:
            "/:path((?!api|assets|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
          has: [
            {
              type: "host",
              value: `(?<subdomain>[^.]+).${process.env.STATUS_PAGE_DOMAIN ?? "localhost"}`,
            },
          ],
          missing: [
            {
              type: "header",
              key: "x-proxy",
              value: "1",
            },
            {
              type: "host",
              value: process.env.STATUS_PAGE_DOMAIN ?? "localhost",
            },
          ],
          destination: "/:subdomain/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
