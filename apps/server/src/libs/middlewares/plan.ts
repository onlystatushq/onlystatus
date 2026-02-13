import type { Variables } from "@/types";
import type { Workspace } from "@openstatus/db/src/schema";
import type { Context, Next } from "hono";

/**
 * No-op: All workspaces are on team plan in self-hosted mode.
 */
export function minPlanMiddleware({ plan }: { plan: Workspace["plan"] }) {
  return async (_c: Context<{ Variables: Variables }, "/*">, next: Next) => {
    await next();
  };
}
