import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const webauthnChallenge = sqliteTable("webauthn_challenge", {
  id: integer("id").primaryKey(),
  challenge: text("challenge").notNull().unique(),
  userId: integer("user_id"),
  type: text("type").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ),
});
