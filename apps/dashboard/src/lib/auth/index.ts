import type { DefaultSession } from "next-auth";
import NextAuth from "next-auth";

import { db, eq } from "@openstatus/db";
import { user } from "@openstatus/db/src/schema";

import { adapter } from "./adapter";
import { CredentialsProvider } from "./providers";

export type { DefaultSession };

// Token version cache: userId -> { version, fetchedAt }
const tokenVersionCache = new Map<
  number,
  { version: number; fetchedAt: number }
>();
const TOKEN_VERSION_CACHE_TTL = 30_000; // 30 seconds

async function getCachedTokenVersion(userId: number): Promise<number> {
  const cached = tokenVersionCache.get(userId);
  if (cached && Date.now() - cached.fetchedAt < TOKEN_VERSION_CACHE_TTL) {
    return cached.version;
  }

  const dbUser = await db
    .select({ tokenVersion: user.tokenVersion })
    .from(user)
    .where(eq(user.id, userId))
    .get();

  const version = dbUser?.tokenVersion ?? 0;
  tokenVersionCache.set(userId, { version, fetchedAt: Date.now() });
  return version;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  providers: [CredentialsProvider],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user: authUser, trigger }) {
      // On sign-in: stamp user data into token
      if (trigger === "signIn" && authUser) {
        token.userId = authUser.id;
        token.email = authUser.email ?? undefined;
        const dbUser = await db
          .select({ tokenVersion: user.tokenVersion })
          .from(user)
          .where(eq(user.id, Number(authUser.id)))
          .get();
        token.tokenVersion = dbUser?.tokenVersion ?? 0;
      }

      // On every request: verify tokenVersion (cached)
      if (token.userId) {
        const currentVersion = await getCachedTokenVersion(
          Number(token.userId),
        );
        if (currentVersion !== token.tokenVersion) {
          // Force logout: token version mismatch
          return null as any;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  debug: process.env.NODE_ENV === "development",
});
