import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.SELF_HOST === "true" ? "standalone" : undefined,
  serverExternalPackages: ["argon2", "nodemailer", "drizzle-orm"],
  turbopack: {
    root: process.env.TURBOPACK_ROOT,
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
};

export default nextConfig;
