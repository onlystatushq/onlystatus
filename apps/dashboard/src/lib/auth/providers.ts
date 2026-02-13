import Credentials from "next-auth/providers/credentials";

import { and, db, eq, gt, lt, sql } from "@openstatus/db";
import { loginAttempt, recoveryCode, user } from "@openstatus/db/src/schema";
import argon2 from "argon2";
import { verifyPassword } from "./password";
import { decryptTotpSecret, verifyTotpCode } from "./totp";
import { verifyBridgeToken } from "./webauthn";

async function checkRateLimit(email: string, ip?: string): Promise<boolean> {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  const emailAttempts = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginAttempt)
    .where(
      and(
        eq(loginAttempt.email, email),
        gt(loginAttempt.attemptedAt, fifteenMinAgo),
      ),
    )
    .get();

  if (emailAttempts && emailAttempts.count >= 5) return true;

  if (ip) {
    const ipAttempts = await db
      .select({ count: sql<number>`count(*)` })
      .from(loginAttempt)
      .where(
        and(eq(loginAttempt.ip, ip), gt(loginAttempt.attemptedAt, fifteenMinAgo)),
      )
      .get();

    if (ipAttempts && ipAttempts.count >= 20) return true;
  }

  return false;
}

async function recordFailedAttempt(
  email: string,
  ip?: string,
): Promise<void> {
  await db.insert(loginAttempt).values({ email, ip });
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  await db
    .delete(loginAttempt)
    .where(lt(loginAttempt.attemptedAt, oneHourAgo));
}

async function clearFailedAttempts(email: string): Promise<void> {
  await db.delete(loginAttempt).where(eq(loginAttempt.email, email));
}

async function verifyRecoveryCode(
  userId: number,
  inputCode: string,
): Promise<boolean> {
  const codes = await db
    .select()
    .from(recoveryCode)
    .where(
      and(
        eq(recoveryCode.userId, userId),
        sql`${recoveryCode.usedAt} IS NULL`,
      ),
    );

  let matchedId: number | null = null;
  for (const code of codes) {
    const matches = await argon2.verify(code.codeHash, inputCode);
    if (matches && matchedId === null) {
      matchedId = code.id;
    }
  }

  if (matchedId !== null) {
    await db
      .update(recoveryCode)
      .set({ usedAt: new Date() })
      .where(eq(recoveryCode.id, matchedId));
    return true;
  }
  return false;
}

export const CredentialsProvider = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
    totpCode: { label: "2FA Code", type: "text" },
    loginToken: { label: "Login Token", type: "text" },
  },
  async authorize(credentials) {
    try {
      // --- WebAuthn bridge token path ---
      if (credentials?.loginToken) {
        const userId = verifyBridgeToken(credentials.loginToken as string);
        if (!userId) return null;

        const dbUser = await db
          .select()
          .from(user)
          .where(eq(user.id, userId))
          .get();

        if (!dbUser || dbUser.disabled) return null;

        return {
          ...dbUser,
          id: dbUser.id.toString(),
          email: dbUser.email || "",
        } as any;
      }

      // --- Standard password path ---
      if (!credentials?.email || !credentials?.password) {
        console.log("[auth] Missing email or password");
        return null;
      }

      const email = credentials.email as string;
      const password = credentials.password as string;
      const totpCode = credentials.totpCode as string | undefined;

      console.log("[auth] Attempting login for:", email);

      const rateLimited = await checkRateLimit(email);
      if (rateLimited) {
        console.log("[auth] Rate limited:", email);
        return null;
      }

      const dbUser = await db
        .select()
        .from(user)
        .where(eq(user.email, email))
        .get();

      if (!dbUser || !dbUser.passwordHash) {
        console.log("[auth] User not found or no password:", email);
        await recordFailedAttempt(email);
        return null;
      }

      if (dbUser.disabled) {
        console.log("[auth] User disabled:", email);
        return null;
      }

      const valid = await verifyPassword(dbUser.passwordHash, password);
      if (!valid) {
        console.log("[auth] Invalid password for:", email);
        await recordFailedAttempt(email);
        return null;
      }

      if (dbUser.totpEnabled) {
        if (!totpCode) {
          throw new Error("TOTP_REQUIRED");
        }
        const secret = decryptTotpSecret(dbUser.totpSecret!);
        const totpValid = verifyTotpCode(secret, totpCode);
        if (!totpValid) {
          const recoveryValid = await verifyRecoveryCode(dbUser.id, totpCode);
          if (!recoveryValid) {
            await recordFailedAttempt(email);
            return null;
          }
        }
      }

      await clearFailedAttempts(email);

      console.log("[auth] Login success for:", email, "id:", dbUser.id);
      return {
        ...dbUser,
        id: dbUser.id.toString(),
        email: dbUser.email || "",
      } as any;
    } catch (e) {
      if (e instanceof Error && e.message === "TOTP_REQUIRED") throw e;
      console.error("[auth] Authorize error:", e);
      return null;
    }
  },
});
