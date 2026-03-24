import { z } from "zod";

import { and, eq, gte, isNotNull, lte, notInArray } from "@openstatus/db";
import {
  type MonitorStatus,
  maintenance,
  monitor,
  monitorStatusTable,
  selectMonitorSchema,
  selectMonitorStatusSchema,
} from "@openstatus/db/src/schema";
import {
  maintenancesToPageComponents,
  pageComponent,
} from "@openstatus/db/src/schema/page_components";
import { db } from "../lib/db";

import { getSentry } from "@hono/sentry";
import { getLogger } from "@logtape/logtape";
import type { monitorPeriodicitySchema } from "@openstatus/db/src/schema/constants";
import {
  type DNSPayloadSchema,
  type httpPayloadSchema,
  type tpcPayloadSchema,
  transformHeaders,
} from "@openstatus/utils";
import type { Context } from "hono";
import { env } from "../env";

export const isAuthorizedDomain = (url: string) => {
  return url.includes(env().SITE_URL);
};

const logger = getLogger("workflow");

export async function sendCheckerTasks(
  periodicity: z.infer<typeof monitorPeriodicitySchema>,
  c: Context,
) {
  const timestamp = Date.now();

  const currentMaintenance = db
    .select({ id: maintenance.id })
    .from(maintenance)
    .where(
      and(lte(maintenance.from, new Date()), gte(maintenance.to, new Date())),
    )
    .as("currentMaintenance");

  const currentMaintenanceMonitors = db
    .select({ id: pageComponent.monitorId })
    .from(maintenancesToPageComponents)
    .innerJoin(
      currentMaintenance,
      eq(maintenancesToPageComponents.maintenanceId, currentMaintenance.id),
    )
    .innerJoin(
      pageComponent,
      eq(maintenancesToPageComponents.pageComponentId, pageComponent.id),
    )
    .where(isNotNull(pageComponent.monitorId));

  const result = await db
    .select()
    .from(monitor)
    .where(
      and(
        eq(monitor.periodicity, periodicity),
        eq(monitor.active, true),
        notInArray(monitor.id, currentMaintenanceMonitors),
      ),
    )
    .all();

  logger.info("Starting cron job", {
    periodicity,
    monitor_count: result.length,
  });

  const monitors = z.array(selectMonitorSchema).safeParse(result);
  const allResult = [];
  if (!monitors.success) {
    logger.error(`Error while fetching the monitors ${monitors.error}`);
    throw new Error("Error while fetching the monitors");
  }

  for (const row of monitors.data) {
    const result = await db
      .select()
      .from(monitorStatusTable)
      .where(eq(monitorStatusTable.monitorId, row.id))
      .all();
    const monitorStatus = z.array(selectMonitorStatusSchema).safeParse(result);
    if (!monitorStatus.success) {
      logger.error("Failed to parse monitor status", {
        monitor_id: row.id,
        error_message: monitorStatus.error.message,
      });
      continue;
    }

    // Self-hosted: use "local" region if available, otherwise fall back to first configured region
    const region = row.regions.includes("local") ? "local" : row.regions[0];
    if (!region) {
      logger.warn("Monitor has no regions configured, skipping", { monitor_id: row.id });
      continue;
    }

    const status =
      monitorStatus.data.find((m) => region === m.region)?.status || "active";

    const response = dispatchCheck({ row, timestamp, status });
    allResult.push(response);

    if (periodicity === "30s") {
      // Schedule a second check offset by 30s for 30s periodicity
      const scheduledAt = timestamp + 30 * 1000;
      const delayedResponse = new Promise<Response>((resolve, reject) => {
        setTimeout(() => {
          dispatchCheck({ row, timestamp: scheduledAt, status }).then(
            resolve,
            reject,
          );
        }, 30 * 1000);
      });
      allResult.push(delayedResponse);
    }
  }

  const allRequests = await Promise.allSettled(allResult);

  const success = allRequests.filter((r) => r.status === "fulfilled").length;
  const failed = allRequests.filter((r) => r.status === "rejected").length;

  logger.info("Completed cron job", {
    periodicity,
    total_tasks: allResult.length,
    success_count: success,
    failed_count: failed,
  });
  if (failed > 0) {
    logger.error("Cron job had failures", {
      periodicity,
      failed_count: failed,
      success_count: success,
    });
    getSentry(c).captureMessage(
      `sendCheckerTasks for ${periodicity} ended with ${failed} failed tasks`,
      "error",
    );
  }
}

/**
 * Builds the check payload for the given monitor and dispatches it
 * directly to the checker service via HTTP POST.
 *
 * Replaces the previous GCP Cloud Tasks dispatch that fanned out
 * to a remote multi-region checker fleet.
 */
async function dispatchCheck({
  row,
  timestamp,
  status,
}: {
  row: z.infer<typeof selectMonitorSchema>;
  timestamp: number;
  status: MonitorStatus;
}) {
  const payload = buildPayload(row, timestamp, status);
  if (!payload) {
    throw new Error(`Invalid jobType: ${row.jobType}`);
  }

  const checkerUrl = env().CHECKER_URL;
  const url = `${checkerUrl}/checker/${row.jobType}?monitor_id=${row.id}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${env().CRON_SECRET}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Checker returned ${response.status} for monitor ${row.id}: ${body}`,
    );
  }

  return response;
}

/**
 * Constructs the HTTP/TCP/DNS payload for a monitor check.
 * The payload format matches what the Go checker binary expects
 * (see apps/checker/request/request.go).
 */
function buildPayload(
  row: z.infer<typeof selectMonitorSchema>,
  timestamp: number,
  status: MonitorStatus,
):
  | z.infer<typeof httpPayloadSchema>
  | z.infer<typeof tpcPayloadSchema>
  | z.infer<typeof DNSPayloadSchema>
  | null {
  const otelConfig = row.otelEndpoint
    ? {
        endpoint: row.otelEndpoint,
        headers: transformHeaders(row.otelHeaders),
      }
    : undefined;

  if (row.jobType === "http") {
    return {
      workspaceId: String(row.workspaceId),
      monitorId: String(row.id),
      url: row.url,
      method: row.method || "GET",
      cronTimestamp: timestamp,
      body: row.body,
      headers: row.headers,
      status: status,
      assertions: row.assertions ? JSON.parse(row.assertions) : null,
      degradedAfter: row.degradedAfter,
      timeout: row.timeout,
      trigger: "cron",
      otelConfig,
      retry: row.retry || 3,
      followRedirects:
        row.followRedirects === null ? true : row.followRedirects,
    };
  }

  if (row.jobType === "tcp") {
    return {
      workspaceId: String(row.workspaceId),
      monitorId: String(row.id),
      uri: row.url,
      status: status,
      assertions: row.assertions ? JSON.parse(row.assertions) : null,
      cronTimestamp: timestamp,
      degradedAfter: row.degradedAfter,
      timeout: row.timeout,
      trigger: "cron",
      retry: row.retry || 3,
      otelConfig,
    };
  }

  if (row.jobType === "dns") {
    return {
      workspaceId: String(row.workspaceId),
      monitorId: String(row.id),
      uri: row.url,
      cronTimestamp: timestamp,
      status: status,
      assertions: row.assertions ? JSON.parse(row.assertions) : null,
      degradedAfter: row.degradedAfter,
      timeout: row.timeout,
      trigger: "cron",
      otelConfig,
      retry: row.retry || 3,
    };
  }

  return null;
}
