import { TRPCError } from "@trpc/server";
import { eq, sql } from "@openstatus/db";
import {
  recoveryCode,
  user,
  usersToWorkspaces,
  webauthnCredential,
} from "@openstatus/db/src/schema";
import argon2 from "argon2";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  rootProcedure,
} from "../trpc";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  verifyTotpCode,
} from "../utils/totp";
import { createUserWithWorkspace } from "../utils/user";

async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export const authRouter = createTRPCRouter({
  // Public: Check if any users exist (for first-time setup detection)
  hasUsers: publicProcedure.query(async (opts) => {
    const firstUser = await opts.ctx.db
      .select({ id: user.id })
      .from(user)
      .limit(1)
      .get();
    return { hasUsers: !!firstUser };
  }),

  // Public: Register first user (root) or when public registration enabled
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        password: z.string().min(12).max(128),
      }),
    )
    .mutation(async (opts) => {
      const { name, email, password } = opts.input;

      const existingUser = await opts.ctx.db
        .select({ id: user.id })
        .from(user)
        .limit(1)
        .get();

      if (existingUser && process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Registration is disabled",
        });
      }

      const emailExists = await opts.ctx.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .get();

      if (emailExists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

      const passwordHash = await hashPassword(password);
      const isRoot = !existingUser;

      const newUser = await createUserWithWorkspace({
        db: opts.ctx.db as any,
        data: { name, email, passwordHash, isRoot },
      });

      return { userId: newUser.id, isRoot };
    }),

  // Protected: Change own password
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(12).max(128),
      }),
    )
    .mutation(async (opts) => {
      const dbUser = await opts.ctx.db
        .select()
        .from(user)
        .where(eq(user.id, opts.ctx.user.id))
        .get();

      if (!dbUser?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const valid = await verifyPassword(
        dbUser.passwordHash,
        opts.input.currentPassword,
      );
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password incorrect",
        });
      }

      const newHash = await hashPassword(opts.input.newPassword);
      await opts.ctx.db
        .update(user)
        .set({
          passwordHash: newHash,
          forcePasswordChange: 0,
          tokenVersion: sql`token_version + 1`,
          updatedAt: new Date(),
        })
        .where(eq(user.id, opts.ctx.user.id));

      return { success: true };
    }),

  // Root only: Create teammate account
  createUser: rootProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        password: z.string().min(12).max(128),
        role: z.enum(["admin", "member"]).default("member"),
      }),
    )
    .mutation(async (opts) => {
      const emailExists = await opts.ctx.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, opts.input.email))
        .get();

      if (emailExists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

      const passwordHash = await hashPassword(opts.input.password);
      const newUser = await opts.ctx.db
        .insert(user)
        .values({
          name: opts.input.name,
          email: opts.input.email,
          passwordHash,
          isRoot: 0,
          forcePasswordChange: 1,
        })
        .returning()
        .get();

      // Add to root's workspace
      await opts.ctx.db.insert(usersToWorkspaces).values({
        userId: newUser.id,
        workspaceId: opts.ctx.workspace!.id,
        role: opts.input.role,
      });

      return { userId: newUser.id };
    }),

  // Protected: Setup 2FA (returns QR code URI + recovery codes preview)
  setupTotp: protectedProcedure.mutation(async (opts) => {
    const dbUser = await opts.ctx.db
      .select({
        totpEnabled: user.totpEnabled,
        email: user.email,
      })
      .from(user)
      .where(eq(user.id, opts.ctx.user.id))
      .get();

    if (dbUser?.totpEnabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "2FA is already enabled",
      });
    }

    const { secret, uri } = generateTotpSecret(
      "OpenStatus",
      dbUser?.email || "user",
    );
    const encrypted = encryptTotpSecret(secret);

    // Store as pending (not yet verified)
    await opts.ctx.db
      .update(user)
      .set({
        totpSecret: `pending_${encrypted}`,
        updatedAt: new Date(),
      })
      .where(eq(user.id, opts.ctx.user.id));

    return { uri, secret };
  }),

  // Protected: Verify TOTP code and activate 2FA
  verifyTotp: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async (opts) => {
      const dbUser = await opts.ctx.db
        .select({
          totpSecret: user.totpSecret,
        })
        .from(user)
        .where(eq(user.id, opts.ctx.user.id))
        .get();

      if (!dbUser?.totpSecret?.startsWith("pending_")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No pending 2FA setup",
        });
      }

      const encrypted = dbUser.totpSecret.replace("pending_", "");
      const secret = decryptTotpSecret(encrypted);
      const valid = verifyTotpCode(secret, opts.input.code);

      if (!valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code",
        });
      }

      // Generate and hash recovery codes
      const codes = generateRecoveryCodes();
      const codeHashes = await Promise.all(
        codes.map((c) => hashPassword(c)),
      );

      // Activate 2FA
      await opts.ctx.db
        .update(user)
        .set({
          totpSecret: encrypted,
          totpEnabled: 1,
          updatedAt: new Date(),
        })
        .where(eq(user.id, opts.ctx.user.id));

      // Delete any existing recovery codes and store new ones
      await opts.ctx.db
        .delete(recoveryCode)
        .where(eq(recoveryCode.userId, opts.ctx.user.id));

      await opts.ctx.db.insert(recoveryCode).values(
        codeHashes.map((hash) => ({
          userId: opts.ctx.user.id,
          codeHash: hash,
        })),
      );

      return { success: true, recoveryCodes: codes };
    }),

  // Protected: Disable 2FA (requires password confirmation)
  disableTotp: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async (opts) => {
      const dbUser = await opts.ctx.db
        .select({
          passwordHash: user.passwordHash,
          totpEnabled: user.totpEnabled,
        })
        .from(user)
        .where(eq(user.id, opts.ctx.user.id))
        .get();

      if (!dbUser?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      if (!dbUser.totpEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA is not enabled",
        });
      }

      const valid = await verifyPassword(dbUser.passwordHash, opts.input.password);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Password incorrect",
        });
      }

      // Disable 2FA and invalidate sessions
      await opts.ctx.db
        .update(user)
        .set({
          totpSecret: null,
          totpEnabled: 0,
          tokenVersion: sql`token_version + 1`,
          updatedAt: new Date(),
        })
        .where(eq(user.id, opts.ctx.user.id));

      // Delete recovery codes
      await opts.ctx.db
        .delete(recoveryCode)
        .where(eq(recoveryCode.userId, opts.ctx.user.id));

      return { success: true };
    }),

  // Protected: Mark onboarding as completed
  completeOnboarding: protectedProcedure.mutation(async (opts) => {
    await opts.ctx.db
      .update(user)
      .set({
        onboardingCompleted: 1,
        updatedAt: new Date(),
      })
      .where(eq(user.id, opts.ctx.user.id));
    return { success: true };
  }),

  // Public: Check if any passkeys exist (for login page UI)
  hasPasskeys: publicProcedure.query(async (opts) => {
    const first = await opts.ctx.db
      .select({ id: webauthnCredential.id })
      .from(webauthnCredential)
      .limit(1)
      .get();
    return { hasPasskeys: !!first };
  }),

  // Protected: List user's passkeys
  listPasskeys: protectedProcedure.query(async (opts) => {
    const credentials = await opts.ctx.db
      .select({
        id: webauthnCredential.id,
        name: webauthnCredential.name,
        deviceType: webauthnCredential.deviceType,
        backedUp: webauthnCredential.backedUp,
        createdAt: webauthnCredential.createdAt,
      })
      .from(webauthnCredential)
      .where(eq(webauthnCredential.userId, opts.ctx.user.id));

    return credentials;
  }),

  // Protected: Rename a passkey
  renamePasskey: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).max(50) }))
    .mutation(async (opts) => {
      const cred = await opts.ctx.db
        .select({ userId: webauthnCredential.userId })
        .from(webauthnCredential)
        .where(eq(webauthnCredential.id, opts.input.id))
        .get();

      if (!cred || cred.userId !== opts.ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await opts.ctx.db
        .update(webauthnCredential)
        .set({ name: opts.input.name })
        .where(eq(webauthnCredential.id, opts.input.id));

      return { success: true };
    }),

  // Protected: Remove a passkey (requires password)
  removePasskey: protectedProcedure
    .input(z.object({ id: z.number(), password: z.string() }))
    .mutation(async (opts) => {
      const dbUser = await opts.ctx.db
        .select({ passwordHash: user.passwordHash })
        .from(user)
        .where(eq(user.id, opts.ctx.user.id))
        .get();

      if (!dbUser?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const valid = await verifyPassword(dbUser.passwordHash, opts.input.password);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Password incorrect",
        });
      }

      const cred = await opts.ctx.db
        .select({ userId: webauthnCredential.userId })
        .from(webauthnCredential)
        .where(eq(webauthnCredential.id, opts.input.id))
        .get();

      if (!cred || cred.userId !== opts.ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await opts.ctx.db
        .delete(webauthnCredential)
        .where(eq(webauthnCredential.id, opts.input.id));

      return { success: true };
    }),

  // Root only: Disable/enable user
  toggleUserStatus: rootProcedure
    .input(
      z.object({
        userId: z.number(),
        disabled: z.boolean(),
      }),
    )
    .mutation(async (opts) => {
      if (opts.input.userId === opts.ctx.user!.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot disable yourself",
        });
      }
      await opts.ctx.db
        .update(user)
        .set({
          disabled: opts.input.disabled ? 1 : 0,
          tokenVersion: sql`token_version + 1`,
          updatedAt: new Date(),
        })
        .where(eq(user.id, opts.input.userId));
      return { success: true };
    }),
});
