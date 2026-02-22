"use server";

import { signIn } from "@/lib/auth";
import {
  consumeChallenge,
  createBridgeToken,
  getWebAuthnConfig,
  storeChallenge,
} from "@/lib/auth/webauthn";
import { db, eq } from "@openstatus/db";
import { user, webauthnCredential } from "@openstatus/db/src/schema";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { AuthError } from "next-auth";
import { headers } from "next/headers";

export async function signInWithCredentialsAction(input: {
  email: string;
  password: string;
  totpCode?: string;
  redirectTo?: string;
}): Promise<{ error?: string } | undefined> {
  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      totpCode: input.totpCode || "",
      redirectTo: input.redirectTo ?? "/",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.message?.includes("TOTP_REQUIRED") || e.cause?.err?.message?.includes("TOTP_REQUIRED")) {
        return { error: "TOTP_REQUIRED" };
      }
      return { error: "Invalid credentials." };
    }
    // NEXT_REDIRECT errors must be re-thrown
    if (
      e instanceof Error &&
      "digest" in e &&
      typeof (e as any).digest === "string" &&
      (e as any).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    return { error: "An unexpected error occurred." };
  }
}

export async function getPasskeyLoginOptions() {
  const h = await headers();
  const config = getWebAuthnConfig(h.get("host") || undefined);

  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    userVerification: "preferred",
    timeout: 60000,
  });

  await storeChallenge(options.challenge, "authentication");

  return options;
}

export async function signInWithPasskeyAction(
  response: AuthenticationResponseJSON,
  redirectTo?: string,
): Promise<{ error?: string } | undefined> {
  const h = await headers();
  const config = getWebAuthnConfig(h.get("host") || undefined);

  const clientData = JSON.parse(
    Buffer.from(response.response.clientDataJSON, "base64url").toString(),
  );
  const challengeValid = await consumeChallenge(clientData.challenge);
  if (!challengeValid) return { error: "Invalid or expired challenge." };

  const credentialIdB64 = response.id;
  const stored = await db
    .select()
    .from(webauthnCredential)
    .where(eq(webauthnCredential.credentialId, credentialIdB64))
    .get();

  if (!stored) return { error: "Passkey not recognized." };

  const dbUser = await db
    .select({ id: user.id, disabled: user.disabled })
    .from(user)
    .where(eq(user.id, stored.userId))
    .get();

  if (!dbUser || dbUser.disabled) return { error: "Account disabled." };

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: clientData.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      credential: {
        id: stored.credentialId,
        publicKey: Buffer.from(stored.publicKey, "base64url"),
        counter: stored.counter,
      },
    });

    if (!verification.verified) return { error: "Verification failed." };

    await db
      .update(webauthnCredential)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(webauthnCredential.id, stored.id));

    const bridgeToken = createBridgeToken(dbUser.id);

    await signIn("credentials", {
      loginToken: bridgeToken,
      redirectTo: redirectTo ?? "/",
    });
  } catch (e) {
    if (
      e instanceof Error &&
      "digest" in e &&
      typeof (e as any).digest === "string" &&
      (e as any).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    return { error: "Passkey verification failed." };
  }
}
