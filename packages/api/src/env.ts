import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    STRIPE_SECRET_KEY: z.string(),
    PROJECT_ID_VERCEL: z.string(),
    TEAM_ID_VERCEL: z.string(),
    VERCEL_AUTH_BEARER_TOKEN: z.string(),
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
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    PROJECT_ID_VERCEL: process.env.PROJECT_ID_VERCEL,
    TEAM_ID_VERCEL: process.env.TEAM_ID_VERCEL,
    VERCEL_AUTH_BEARER_TOKEN: process.env.VERCEL_AUTH_BEARER_TOKEN,
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
