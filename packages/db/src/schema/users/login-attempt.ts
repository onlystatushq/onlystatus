import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const loginAttempt = sqliteTable("login_attempt", {
  id: integer("id").primaryKey(),
  email: text("email").notNull(),
  ip: text("ip"),
  attemptedAt: integer("attempted_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`,
  ),
});
