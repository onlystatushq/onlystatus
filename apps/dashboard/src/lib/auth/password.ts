import argon2 from "argon2";

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB (OWASP 2025)
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    console.log("[auth] verifyPassword hash:", hash.substring(0, 40), "pw_len:", plain.length, "pw_type:", typeof plain);
    const result = await argon2.verify(hash, plain);
    console.log("[auth] verifyPassword result:", result);
    return result;
  } catch (e) {
    console.error("[auth] argon2.verify threw:", e);
    return false;
  }
}
