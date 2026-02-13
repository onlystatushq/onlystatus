import crypto from "node:crypto";
import { and, db, eq, gt, lt } from "@openstatus/db";
import { webauthnChallenge } from "@openstatus/db/src/schema";

// --- RP Configuration ---

export function getWebAuthnConfig(requestUrl?: string) {
  const url = requestUrl
    ? new URL(requestUrl)
    : new URL(process.env.NEXTAUTH_URL || "http://localhost:3002");

  return {
    rpName: "OpenStatus",
    rpID: url.hostname,
    origin: url.origin,
  };
}

// --- Bridge Token ---

export function createBridgeToken(userId: number): string {
  const payload = `webauthn:${userId}:${Date.now()}`;
  const hmac = crypto
    .createHmac("sha256", process.env.AUTH_SECRET!)
    .update(payload)
    .digest("hex");
  return `${payload}:${hmac}`;
}

export function verifyBridgeToken(token: string): number | null {
  const parts = token.split(":");
  if (parts.length !== 4 || parts[0] !== "webauthn") return null;

  const [prefix, userIdStr, timestampStr, receivedHmac] = parts;
  const payload = `${prefix}:${userIdStr}:${timestampStr}`;

  const expectedHmac = crypto
    .createHmac("sha256", process.env.AUTH_SECRET!)
    .update(payload)
    .digest("hex");

  if (
    !crypto.timingSafeEqual(
      Buffer.from(receivedHmac, "hex"),
      Buffer.from(expectedHmac, "hex"),
    )
  ) {
    return null;
  }

  const timestamp = Number.parseInt(timestampStr, 10);
  if (Date.now() - timestamp > 60_000) return null;

  return Number.parseInt(userIdStr, 10);
}

// --- Challenge Management ---

export async function storeChallenge(
  challenge: string,
  type: "registration" | "authentication",
  userId?: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(webauthnChallenge).values({
    challenge,
    type,
    userId: userId ?? null,
    expiresAt,
  });

  // Prune expired challenges
  await db
    .delete(webauthnChallenge)
    .where(lt(webauthnChallenge.expiresAt, new Date()));
}

export async function consumeChallenge(challenge: string): Promise<boolean> {
  const row = await db
    .select()
    .from(webauthnChallenge)
    .where(
      and(
        eq(webauthnChallenge.challenge, challenge),
        gt(webauthnChallenge.expiresAt, new Date()),
      ),
    )
    .get();

  if (!row) return false;

  await db
    .delete(webauthnChallenge)
    .where(eq(webauthnChallenge.id, row.id));

  return true;
}
