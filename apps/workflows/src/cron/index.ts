import { getSentry } from "@hono/sentry";
import { monitorPeriodicitySchema } from "@openstatus/db/src/schema/constants";
import { Hono } from "hono";
import { env } from "../env";
import { sendCheckerTasks } from "./checker";

const app = new Hono({ strict: false });

app.use("*", async (c, next) => {
  if (c.req.header("authorization") !== env().CRON_SECRET) {
    return c.text("Unauthorized", 401);
  }
  return next();
});

app.get("/checker/:period", async (c) => {
  const period = c.req.param("period");

  const schema = monitorPeriodicitySchema.safeParse(period);

  if (!schema.success) {
    return c.json({ error: schema.error.issues?.[0].message }, 400);
  }
  const sentry = getSentry(c);
  const checkInId = sentry.captureCheckIn({
    monitorSlug: period,
    status: "in_progress",
  });
  try {
    await sendCheckerTasks(schema.data, c);
    sentry.captureCheckIn({
      checkInId,
      monitorSlug: period,
      status: "ok",
    });
    return c.json({ success: schema.data }, 200);
  } catch (e) {
    console.error(e);
    sentry.captureMessage(`Error in /checker/${period} cron: ${e}`, "error");
    sentry.captureCheckIn({
      checkInId,
      monitorSlug: period,
      status: "error",
    });
    return c.text("Internal Server Error", 500);
  }
});

export { app as cronRouter };
