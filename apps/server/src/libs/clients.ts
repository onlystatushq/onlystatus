import { env } from "@/env";
import { OSTinybird } from "@openstatus/tinybird";

/**
 * Shared singleton instances for external services.
 * Using singletons prevents memory leaks from creating multiple instances
 * and ensures proper connection pooling.
 */

// Tinybird client singleton
export const tb = new OSTinybird(env.TINY_BIRD_API_KEY);

// Redis client singleton (optional for self-hosted)
function createRedis() {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
  return Redis.fromEnv();
}

export const redis = createRedis();
