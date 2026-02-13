import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    TINY_BIRD_API_KEY: z.string(),
    SMTP_HOST: z.string(),
    SMTP_PORT: z.coerce.number(),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),
    CRON_SECRET: z.string(),
    UNKEY_TOKEN: z.string(),
    UNKEY_API_ID: z.string(),
    SLACK_FEEDBACK_WEBHOOK_URL: z.string().optional(),
  },

  runtimeEnv: {
    TINY_BIRD_API_KEY: process.env.TINY_BIRD_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    CRON_SECRET: process.env.CRON_SECRET,
    UNKEY_TOKEN: process.env.UNKEY_TOKEN,
    UNKEY_API_ID: process.env.UNKEY_API_ID,
    SLACK_FEEDBACK_WEBHOOK_URL: process.env.SLACK_FEEDBACK_WEBHOOK_URL,
  },
  skipValidation: process.env.NODE_ENV === "test",
});
