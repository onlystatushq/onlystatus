import { db, eq, schema } from "@openstatus/db";
import type { Incident, MonitorStatus } from "@openstatus/db/src/schema";
import {
  selectMonitorSchema,
  selectNotificationSchema,
} from "@openstatus/db/src/schema";

import { getLogger } from "@logtape/logtape";
import type { Region } from "@openstatus/db/src/schema/constants";
import { Effect, Schedule } from "effect";
import { checkerAudit } from "../utils/audit-log";
import { providerToFunction } from "./utils";

const logger = getLogger("workflow");

export const triggerNotifications = async ({
  monitorId,
  statusCode,
  message,
  notifType,
  cronTimestamp,
  incidentId,
  regions,
  latency,
}: {
  monitorId: string;
  statusCode?: number;
  message?: string;
  notifType: "alert" | "recovery" | "degraded" | "cert-expiry";
  cronTimestamp: number;
  incidentId?: number;
  regions?: string[];
  latency?: number;
}): Promise<{ notificationId: number; provider: string }[]> => {
  logger.info("Triggering alerting", {
    monitor_id: monitorId,
    notification_type: notifType,
  });

  const triggered: { notificationId: number; provider: string }[] = [];

  let incident: Incident | undefined;
  if (incidentId) {
    try {
      incident = await db.query.incidentTable.findFirst({
        where: eq(schema.incidentTable.id, incidentId),
      });
    } catch (err) {
      logger.warn("Failed to fetch incident data", {
        incident_id: incidentId,
        error_message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const notifications = await db
    .select()
    .from(schema.notificationsToMonitors)
    .innerJoin(
      schema.notification,
      eq(schema.notification.id, schema.notificationsToMonitors.notificationId),
    )
    .innerJoin(
      schema.monitor,
      eq(schema.monitor.id, schema.notificationsToMonitors.monitorId),
    )
    .where(eq(schema.monitor.id, Number(monitorId)))
    .all();
  for (const notif of notifications) {
    logger.info("Sending notification", {
      monitor_id: monitorId,
      provider: notif.notification.provider,
      notification_type: notifType,
      notification_id: notif.notification.id,
    });
    const monitor = selectMonitorSchema.parse(notif.monitor);
    try {
      await insertNotificationTrigger({
        monitorId: monitor.id,
        notificationId: notif.notification.id,
        cronTimestamp: cronTimestamp,
      });
    } catch (_e) {
      logger.error("notification trigger already exists dont send again");
      continue;
    }
    triggered.push({
      notificationId: notif.notification.id,
      provider: notif.notification.provider,
    });
    switch (notifType) {
      case "alert":
        const alertResult = Effect.tryPromise({
          try: () =>
            providerToFunction[notif.notification.provider].sendAlert({
              monitor,
              notification: selectNotificationSchema.parse(notif.notification),
              statusCode,
              message,
              incident,
              cronTimestamp,
              regions,
              latency,
            }),

          catch: (_unknown) =>
            new Error(
              `Failed sending notification via ${notif.notification.provider} for monitor ${monitorId}`,
            ),
        }).pipe(
          Effect.retry({
            times: 3,
            schedule: Schedule.exponential("1000 millis"),
          }),
        );
        await Effect.runPromise(alertResult).catch((err) =>
          logger.error("Failed to send alert notification", {
            monitor_id: monitorId,
            provider: notif.notification.provider,
            error_message: err instanceof Error ? err.message : String(err),
          }),
        );
        break;
      case "recovery":
        const recoveryResult = Effect.tryPromise({
          try: () =>
            providerToFunction[notif.notification.provider].sendRecovery({
              monitor,
              notification: selectNotificationSchema.parse(notif.notification),
              statusCode,
              message,
              incident,
              cronTimestamp,
              regions,
              latency,
            }),
          catch: (_unknown) =>
            new Error(
              `Failed sending notification via ${notif.notification.provider} for monitor ${monitorId}`,
            ),
        }).pipe(
          Effect.retry({
            times: 3,
            schedule: Schedule.exponential("1000 millis"),
          }),
        );
        await Effect.runPromise(recoveryResult).catch((err) =>
          logger.error("Failed to send recovery notification", {
            monitor_id: monitorId,
            provider: notif.notification.provider,
            error_message: err instanceof Error ? err.message : String(err),
          }),
        );
        break;
      case "degraded":
        const degradedResult = Effect.tryPromise({
          try: () =>
            providerToFunction[notif.notification.provider].sendDegraded({
              monitor,
              notification: selectNotificationSchema.parse(notif.notification),
              statusCode,
              message,
              incident,
              cronTimestamp,
              regions,
              latency,
            }),
          catch: (_unknown) =>
            new Error(
              `Failed sending notification via ${notif.notification.provider} for monitor ${monitorId}`,
            ),
        }).pipe(
          Effect.retry({
            times: 3,
            schedule: Schedule.exponential("1000 millis"),
          }),
        );
        await Effect.runPromise(degradedResult).catch((err) =>
          logger.error("Failed to send degraded notification", {
            monitor_id: monitorId,
            provider: notif.notification.provider,
            error_message: err instanceof Error ? err.message : String(err),
          }),
        );
        break;
      case "cert-expiry":
        const certExpiryResult = Effect.tryPromise({
          try: () =>
            providerToFunction[notif.notification.provider].sendCertExpiry({
              monitor,
              notification: selectNotificationSchema.parse(notif.notification),
              statusCode,
              message,
              cronTimestamp,
              regions,
              latency,
            }),
          catch: (_unknown) =>
            new Error(
              `Failed sending cert-expiry notification via ${notif.notification.provider} for monitor ${monitorId}`,
            ),
        }).pipe(
          Effect.retry({
            times: 3,
            schedule: Schedule.exponential("1000 millis"),
          }),
        );
        await Effect.runPromise(certExpiryResult).catch((err) =>
          logger.error("Failed to send cert-expiry notification", {
            monitor_id: monitorId,
            provider: notif.notification.provider,
            error_message: err instanceof Error ? err.message : String(err),
          }),
        );
        break;
    }
    // ALPHA
    await checkerAudit.publishAuditLog({
      id: `monitor:${monitorId}`,
      action: "notification.sent",
      targets: [{ id: monitorId, type: "monitor" }],
      metadata: {
        provider: notif.notification.provider,
        cronTimestamp,
        type: notifType,
        notificationId: notif.notification.id,
      },
    });
  }

  return triggered;
};

const insertNotificationTrigger = async ({
  monitorId,
  notificationId,
  cronTimestamp,
}: {
  monitorId: number;
  notificationId: number;
  cronTimestamp: number;
}) => {
  await db
    .insert(schema.notificationTrigger)
    .values({
      monitorId: Number(monitorId),
      notificationId: notificationId,
      cronTimestamp: cronTimestamp,
    })
    .returning();
};

export const upsertMonitorStatus = async ({
  monitorId,
  status,
  region,
}: {
  monitorId: string;
  status: MonitorStatus;
  region: Region;
}) => {
  const newData = await db
    .insert(schema.monitorStatusTable)
    .values({ status, region, monitorId: Number(monitorId) })
    .onConflictDoUpdate({
      target: [
        schema.monitorStatusTable.monitorId,
        schema.monitorStatusTable.region,
      ],
      set: { status, updatedAt: new Date() },
    })
    .returning();
  logger.debug("Upserted monitor status", {
    monitor_id: monitorId,
    region,
    status,
    updated_at: newData[0]?.updatedAt,
  });
};
