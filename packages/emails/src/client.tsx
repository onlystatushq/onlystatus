/** @jsxImportSource react */

import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import FollowUpEmail from "../emails/followup";
import type { MonitorAlertProps } from "../emails/monitor-alert";
import PageSubscriptionEmail from "../emails/page-subscription";
import type { PageSubscriptionProps } from "../emails/page-subscription";
import StatusPageMagicLinkEmail from "../emails/status-page-magic-link";
import type { StatusPageMagicLinkProps } from "../emails/status-page-magic-link";
import StatusReportEmail from "../emails/status-report";
import type { StatusReportProps } from "../emails/status-report";
import TeamInvitationEmail from "../emails/team-invitation";
import type { TeamInvitationProps } from "../emails/team-invitation";
import { monitorAlertEmail } from "../hotfix/monitor-alert";

// split an array into chunks of a given size.
function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// simple retry helper with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { times: number; baseDelayMs: number } = {
    times: 3,
    baseDelayMs: 1000,
  },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.times; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < opts.times) {
        const delay = opts.baseDelayMs * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export class EmailClient {
  public readonly client: Transporter;

  constructor(opts: {
    smtpHost: string;
    smtpPort: number;
    smtpUser?: string;
    smtpPass?: string;
    defaultFrom?: string;
  }) {
    this.client = nodemailer.createTransport({
      host: opts.smtpHost,
      port: opts.smtpPort,
      secure: opts.smtpPort === 465,
      auth: opts.smtpUser
        ? { user: opts.smtpUser, pass: opts.smtpPass }
        : undefined,
    });
  }

  public async sendFollowUp(req: { to: string }) {
    if (process.env.NODE_ENV === "development") {
      console.log(`Sending follow up email to ${req.to}`);
      return;
    }

    try {
      const html = await render(<FollowUpEmail />);
      await this.client.sendMail({
        from: "OnlyStatus <notifications@onlystatus.dev>",
        subject: "How's it going with OnlyStatus?",
        to: req.to,
        html,
      });

      console.log(`Sent follow up email to ${req.to}`);
    } catch (err) {
      console.error(`Error sending follow up email to ${req.to}: ${err}`);
    }
  }

  public async sendFollowUpBatched(req: { to: string[] }) {
    if (process.env.NODE_ENV === "development") {
      console.log(`Sending follow up emails to ${req.to.join(", ")}`);
      return;
    }

    const html = await render(<FollowUpEmail />);

    try {
      await Promise.all(
        req.to.map((subscriber) =>
          this.client.sendMail({
            from: "OnlyStatus <notifications@onlystatus.dev>",
            subject: "How's it going with OnlyStatus?",
            to: subscriber,
            html,
          }),
        ),
      );
      console.log(`Sent follow up emails to ${req.to}`);
    } catch (err) {
      console.error(
        `Error sending follow up email to ${req.to}: ${err}`,
      );
    }
  }

  public async sendStatusReportUpdate(
    req: StatusReportProps & {
      subscribers: Array<{ email: string; token: string }>;
      pageSlug: string;
      customDomain?: string | null;
    },
  ) {
    const statusPageBaseUrl = req.customDomain
      ? `https://${req.customDomain}`
      : `https://${req.pageSlug}.onlystatus.dev`;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `Sending status report update emails to ${req.subscribers
          .map((s) => s.email)
          .join(", ")}`,
      );
      return;
    }

    for (const recipients of chunk(req.subscribers, 100)) {
      try {
        await withRetry(
          async () => {
            await Promise.all(
              recipients.map(async (subscriber) => {
                const unsubscribeUrl = `${statusPageBaseUrl}/unsubscribe/${subscriber.token}`;
                const html = await render(
                  <StatusReportEmail {...req} unsubscribeUrl={unsubscribeUrl} />,
                );
                return this.client.sendMail({
                  from: `${req.pageTitle} <notifications@onlystatus.dev>`,
                  subject: req.reportTitle,
                  to: subscriber.email,
                  html,
                });
              }),
            );
          },
          { times: 3, baseDelayMs: 1000 },
        );
      } catch (err) {
        console.error(
          `Error sending status report update batch to ${recipients.map(
            (r) => r.email,
          )}`,
          err,
        );
      }
    }

    console.log(
      `Sent status report update email to ${req.subscribers.length} subscribers`,
    );
  }

  public async sendTeamInvitation(req: TeamInvitationProps & { to: string }) {
    if (process.env.NODE_ENV === "development") {
      console.log(`Sending team invitation email to ${req.to}`);
      return;
    }

    try {
      const html = await render(<TeamInvitationEmail {...req} />);
      await this.client.sendMail({
        from: `${
          req.workspaceName ?? "OnlyStatus"
        } <notifications@onlystatus.dev>`,
        subject: `You've been invited to join ${
          req.workspaceName ?? "OnlyStatus"
        }`,
        to: req.to,
        html,
      });

      console.log(`Sent team invitation email to ${req.to}`);
    } catch (err) {
      console.error(`Error sending team invitation email to ${req.to}`, err);
    }
  }

  public async sendMonitorAlert(req: MonitorAlertProps & { to: string }) {
    if (process.env.NODE_ENV === "development") {
      console.log(`Sending monitor alert email to ${req.to}`);
      return;
    }

    try {
      // const html = await render(<MonitorAlertEmail {...req} />);
      const html = monitorAlertEmail(req);
      await this.client.sendMail({
        from: "OnlyStatus <notifications@onlystatus.dev>",
        subject: `${req.name}: ${req.type.toUpperCase()}`,
        to: req.to,
        html,
      });

      console.log(`Sent monitor alert email to ${req.to}`);
    } catch (err) {
      console.error(`Error sending monitor alert to ${req.to}`, err);
      throw err;
    }
  }

  public async sendPageSubscription(
    req: PageSubscriptionProps & { to: string },
  ) {
    if (process.env.NODE_ENV === "development") {
      console.log(`Sending page subscription email to ${req.to}`);
      return;
    }

    try {
      const html = await render(<PageSubscriptionEmail {...req} />);
      await this.client.sendMail({
        from: "Status Page <notifications@onlystatus.dev>",
        subject: `Confirm your subscription to ${req.page}`,
        to: req.to,
        html,
      });

      console.log(`Sent page subscription email to ${req.to}`);
    } catch (err) {
      console.error(`Error sending page subscription to ${req.to}`, err);
    }
  }

  public async sendStatusPageMagicLink(
    req: StatusPageMagicLinkProps & { to: string },
  ) {
    if (process.env.NODE_ENV === "development") {
      console.log(`Sending status page magic link email to ${req.to}`);
      console.log(`>>> Magic Link: ${req.link}`);
      return;
    }

    try {
      const html = await render(<StatusPageMagicLinkEmail {...req} />);
      await this.client.sendMail({
        from: "Status Page <notifications@onlystatus.dev>",
        subject: `Authenticate to ${req.page}`,
        to: req.to,
        html,
      });

      console.log(`Sent status page magic link email to ${req.to}`);
    } catch (err) {
      console.error(`Error sending status page magic link to ${req.to}`, err);
    }
  }

  public async sendMaintenanceNotification(req: {
    subscribers: Array<{ email: string; token: string }>;
    pageTitle: string;
    pageSlug: string;
    customDomain?: string | null;
    maintenanceTitle: string;
    message: string;
    from: string;
    to: string;
    pageComponents: string[];
  }) {
    const statusPageBaseUrl = req.customDomain
      ? `https://${req.customDomain}`
      : `https://${req.pageSlug}.onlystatus.dev`;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `Sending maintenance notification emails to ${req.subscribers
          .map((s) => s.email)
          .join(", ")}`,
      );
      return;
    }

    for (const recipients of chunk(req.subscribers, 100)) {
      try {
        await withRetry(
          async () => {
            await Promise.all(
              recipients.map(async (subscriber) => {
                const unsubscribeUrl = `${statusPageBaseUrl}/unsubscribe/${subscriber.token}`;
                const html = await render(
                  <StatusReportEmail
                    pageTitle={req.pageTitle}
                    reportTitle={req.maintenanceTitle}
                    status="maintenance"
                    date={`${req.from} - ${req.to}`}
                    message={req.message}
                    pageComponents={req.pageComponents}
                    unsubscribeUrl={unsubscribeUrl}
                  />,
                );
                return this.client.sendMail({
                  from: `${req.pageTitle} <notifications@onlystatus.dev>`,
                  subject: `Scheduled Maintenance: ${req.maintenanceTitle}`,
                  to: subscriber.email,
                  html,
                });
              }),
            );
          },
          { times: 3, baseDelayMs: 1000 },
        );
      } catch (err) {
        console.error(
          `Error sending maintenance notification batch to ${recipients.map(
            (r) => r.email,
          )}`,
          err,
        );
      }
    }

    console.log(
      `Sent maintenance notification email to ${req.subscribers.length} subscribers`,
    );
  }
}
