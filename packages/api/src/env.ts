import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    TINY_BIRD_API_KEY: z.string().default(""),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().default(""),
    SMTP_PASS: z.string().default(""),
    CHECKER_URL: z.string().url().default("http://checker:8080"),
    CRON_SECRET: z.string().default(""),
    UNKEY_TOKEN: z.string().default(""),
    UNKEY_API_ID: z.string().default(""),
    SLACK_FEEDBACK_WEBHOOK_URL: z.string().optional(),
  },

  runtimeEnv: {
    TINY_BIRD_API_KEY: process.env.TINY_BIRD_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    CHECKER_URL: process.env.CHECKER_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    UNKEY_TOKEN: process.env.UNKEY_TOKEN,
    UNKEY_API_ID: process.env.UNKEY_API_ID,
    SLACK_FEEDBACK_WEBHOOK_URL: process.env.SLACK_FEEDBACK_WEBHOOK_URL,
  },
  skipValidation: process.env.NODE_ENV === "test",
});
