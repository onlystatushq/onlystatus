import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { monitor } from "../monitors/monitor";

export const certNotificationSent = sqliteTable(
    "cert_notification_sent",
    {
        id: integer("id").primaryKey(),
        monitorId: integer("monitor_id")
            .notNull()
            .references(() => monitor.id, { onDelete: "cascade" }),
        thresholdDays: integer("threshold_days").notNull(),
        certFingerprint: text("cert_fingerprint").notNull(),
        sentAt: integer("sent_at", { mode: "timestamp" })
            .notNull()
            .$defaultFn(() => new Date()),
    },
    (table) => ({
        uniqueIdx: uniqueIndex("cert_notif_unique_idx").on(
            table.monitorId,
            table.thresholdDays,
            table.certFingerprint,
        ),
    }),
);
