import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.SELF_HOST === "true" ? "standalone" : undefined,
  serverExternalPackages: ["argon2", "nodemailer"],
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
