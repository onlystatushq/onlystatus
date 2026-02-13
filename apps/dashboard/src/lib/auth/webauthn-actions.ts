"use server";

import { auth } from "@/lib/auth";
import { db, eq } from "@openstatus/db";
import { user, webauthnCredential } from "@openstatus/db/src/schema";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import {
  consumeChallenge,
  getWebAuthnConfig,
  storeChallenge,
} from "./webauthn";

export async function getPasskeyRegistrationOptions() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const userId = Number(session.user.id);
  const dbUser = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .get();
  if (!dbUser) throw new Error("User not found");

  const existing = await db
    .select({ credentialId: webauthnCredential.credentialId })
    .from(webauthnCredential)
    .where(eq(webauthnCredential.userId, userId));

  const config = getWebAuthnConfig();

  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    userName: dbUser.email || `user-${userId}`,
    userDisplayName: dbUser.name || dbUser.email || `User ${userId}`,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
    })),
    timeout: 60000,
  });

  await storeChallenge(options.challenge, "registration", userId);

  return options;
}

export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  name?: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const userId = Number(session.user.id);
  const config = getWebAuthnConfig();

  const clientData = JSON.parse(
    Buffer.from(response.response.clientDataJSON, "base64url").toString(),
  );
  const challengeValid = await consumeChallenge(clientData.challenge);
  if (!challengeValid) throw new Error("Invalid or expired challenge");

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: clientData.challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Verification failed");
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  await db.insert(webauthnCredential).values({
    userId,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp ? 1 : 0,
    transports: response.response.transports
      ? JSON.stringify(response.response.transports)
      : null,
    name: name || "Passkey",
  });

  return { success: true };
}
