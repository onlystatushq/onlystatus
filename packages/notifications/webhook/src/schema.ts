import { webhookDataSchema } from "@openstatus/db/src/schema";
import { z } from "zod";

export const WebhookSchema = webhookDataSchema;

export const PayloadSchema = z.object({
  monitor: z.object({
    id: z.number(),
    name: z.string(),
    url: z.string(),
  }),
  cronTimestamp: z.number(),
  status: z.enum(["degraded", "error", "recovered", "warning"]),
  statusCode: z.number().optional(),
  latency: z.number().optional(),
  errorMessage: z.string().optional(),
  certExpiryDays: z.number().optional(),
  certIssuer: z.string().optional(),
  certExpiresAt: z.number().optional(),
});
