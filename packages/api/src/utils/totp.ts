import crypto from "node:crypto";
import * as OTPAuth from "otpauth";

export function generateTotpSecret(
  issuer: string,
  accountName: string,
): { secret: string; uri: string } {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: accountName,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret(),
  });
  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

export function encryptTotpSecret(secret: string): string {
  const key = new Uint8Array(Buffer.from(process.env.TOTP_ENCRYPTION_KEY!, "hex"));
  const version = process.env.TOTP_KEY_VERSION || "v1";
  const iv = new Uint8Array(crypto.randomBytes(12));
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const part1 = cipher.update(secret, "utf8", "hex");
  const part2 = cipher.final("hex");
  const encrypted = part1 + part2;
  const tag = cipher.getAuthTag();
  return `${version}:${Buffer.from(iv).toString("hex")}:${encrypted}:${tag.toString("hex")}`;
}

export function decryptTotpSecret(stored: string): string {
  const [version, ivHex, dataHex, tagHex] = stored.split(":");
  const key = getKeyForVersion(version);
  const iv = new Uint8Array(Buffer.from(ivHex, "hex"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(new Uint8Array(Buffer.from(tagHex, "hex")));
  return decipher.update(dataHex, "hex", "utf8") + decipher.final("utf8");
}

function getKeyForVersion(version: string): Uint8Array {
  const envKey =
    process.env[`TOTP_ENCRYPTION_KEY_${version.toUpperCase()}`] ||
    process.env.TOTP_ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error(`No TOTP encryption key found for version ${version}`);
  }
  return new Uint8Array(Buffer.from(envKey, "hex"));
}

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // No 0, O, I, L, 1

export function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    let code = "";
    const bytes = crypto.randomBytes(8);
    for (let j = 0; j < 8; j++) {
      code += ALPHABET[bytes[j] % ALPHABET.length];
    }
    codes.push(code);
  }
  return codes;
}
