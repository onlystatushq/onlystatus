/**
 * Emergency root password reset CLI.
 * Usage: pnpm run reset-root-password
 *
 * Requires DATABASE_URL and DATABASE_AUTH_TOKEN environment variables.
 * Must be run interactively (not piped).
 */
import { createClient } from "@libsql/client";
import argon2 from "argon2";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as readline from "node:readline";
import { user } from "../schema/users/user";

function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(question);
      // Mute output for password entry
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      let input = "";
      const onData = (char: Buffer) => {
        const c = char.toString();
        if (c === "\n" || c === "\r") {
          stdin.setRawMode(false);
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          rl.close();
          resolve(input);
        } else if (c === "\u0003") {
          // Ctrl+C
          process.exit(1);
        } else if (c === "\u007F" || c === "\b") {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else {
          input += c;
        }
      };
      stdin.on("data", onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

async function main() {
  // Verify interactive terminal
  if (!process.stdin.isTTY) {
    console.error("Error: This script must be run interactively (not piped).");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  const db = drizzle(
    createClient({
      url: databaseUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    }),
  );

  // Find root user
  const rootUser = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(eq(user.isRoot, 1))
    .get();

  if (!rootUser) {
    console.error("Error: No root user found in database.");
    process.exit(1);
  }

  console.log(`Root user found: ${rootUser.name} (${rootUser.email})`);
  console.log("");

  // Prompt for new password
  const password = await prompt("New password (min 12 characters): ", true);
  if (password.length < 12) {
    console.error("Error: Password must be at least 12 characters.");
    process.exit(1);
  }

  const confirm = await prompt("Confirm password: ", true);
  if (password !== confirm) {
    console.error("Error: Passwords do not match.");
    process.exit(1);
  }

  // Hash and update
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await db
    .update(user)
    .set({
      passwordHash,
      forcePasswordChange: 1,
      tokenVersion: sql`token_version + 1`,
      updatedAt: new Date(),
    })
    .where(eq(user.id, rootUser.id));

  console.log("");
  console.log("Root password has been reset.");
  console.log("The user will be required to change the password on next login.");
  console.log("All existing sessions have been invalidated.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
