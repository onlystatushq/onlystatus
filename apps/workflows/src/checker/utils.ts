import type { NotificationProvider } from "@openstatus/db/src/schema";
import type { NotificationContext } from "@openstatus/notification-base";
import {
  sendAlert as sendDiscordAlert,
  sendCertExpiry as sendDiscordCertExpiry,
  sendDegraded as sendDiscordDegraded,
  sendRecovery as sendDiscordRecovery,
} from "@openstatus/notification-discord";
import {
  sendAlert as sendEmailAlert,
  sendCertExpiry as sendEmailCertExpiry,
  sendDegraded as sendEmailDegraded,
  sendRecovery as sendEmailRecovery,
} from "@openstatus/notification-emails";
import {
  sendAlert as sendGoogleChatAlert,
  sendCertExpiry as sendGoogleChatCertExpiry,
  sendDegraded as sendGoogleChatDegraded,
  sendRecovery as sendGoogleChatRecovery,
} from "@openstatus/notification-google-chat";
import {
  sendAlert as sendGrafanaOncallAlert,
  sendCertExpiry as sendGrafanaOncallCertExpiry,
  sendDegraded as sendGrafanaOncallDegraded,
  sendRecovery as sendGrafanaOncallRecovery,
} from "@openstatus/notification-grafana-oncall";
import {
  sendAlert as sendNtfyAlert,
  sendCertExpiry as sendNtfyCertExpiry,
  sendDegraded as sendNtfyDegraded,
  sendRecovery as sendNtfyRecovery,
} from "@openstatus/notification-ntfy";
import {
  sendAlert as sendOpsGenieAlert,
  sendCertExpiry as sendOpsGenieCertExpiry,
  sendDegraded as sendOpsGenieDegraded,
  sendRecovery as sendOpsGenieRecovery,
} from "@openstatus/notification-opsgenie";
import {
  sendCertExpiry as sendPagerDutyCertExpiry,
  sendDegraded as sendPagerDutyDegraded,
  sendRecovery as sendPagerDutyRecovery,
  sendAlert as sendPagerdutyAlert,
} from "@openstatus/notification-pagerduty";
import {
  sendAlert as sendSlackAlert,
  sendCertExpiry as sendSlackCertExpiry,
  sendDegraded as sendSlackDegraded,
  sendRecovery as sendSlackRecovery,
} from "@openstatus/notification-slack";
import {
  sendAlert as sendTelegramAlert,
  sendCertExpiry as sendTelegramCertExpiry,
  sendDegraded as sendTelegramDegraded,
  sendRecovery as sendTelegramRecovery,
} from "@openstatus/notification-telegram";
import {
  sendAlert as sendWebhookAlert,
  sendCertExpiry as sendWebhookCertExpiry,
  sendDegraded as sendWebhookDegraded,
  sendRecovery as sendWebhookRecovery,
} from "@openstatus/notification-webhook";

type SendNotification = (props: NotificationContext) => Promise<void>;

type Notif = {
  sendAlert: SendNotification;
  sendRecovery: SendNotification;
  sendDegraded: SendNotification;
  sendCertExpiry: SendNotification;
};

export const providerToFunction: Record<NotificationProvider, Notif> = {
  discord: {
    sendAlert: sendDiscordAlert,
    sendRecovery: sendDiscordRecovery,
    sendDegraded: sendDiscordDegraded,
    sendCertExpiry: sendDiscordCertExpiry,
  },
  email: {
    sendAlert: sendEmailAlert,
    sendRecovery: sendEmailRecovery,
    sendDegraded: sendEmailDegraded,
    sendCertExpiry: sendEmailCertExpiry,
  },
  "google-chat": {
    sendAlert: sendGoogleChatAlert,
    sendRecovery: sendGoogleChatRecovery,
    sendDegraded: sendGoogleChatDegraded,
    sendCertExpiry: sendGoogleChatCertExpiry,
  },
  "grafana-oncall": {
    sendAlert: sendGrafanaOncallAlert,
    sendRecovery: sendGrafanaOncallRecovery,
    sendDegraded: sendGrafanaOncallDegraded,
    sendCertExpiry: sendGrafanaOncallCertExpiry,
  },
  ntfy: {
    sendAlert: sendNtfyAlert,
    sendRecovery: sendNtfyRecovery,
    sendDegraded: sendNtfyDegraded,
    sendCertExpiry: sendNtfyCertExpiry,
  },
  opsgenie: {
    sendAlert: sendOpsGenieAlert,
    sendRecovery: sendOpsGenieRecovery,
    sendDegraded: sendOpsGenieDegraded,
    sendCertExpiry: sendOpsGenieCertExpiry,
  },
  pagerduty: {
    sendAlert: sendPagerdutyAlert,
    sendRecovery: sendPagerDutyRecovery,
    sendDegraded: sendPagerDutyDegraded,
    sendCertExpiry: sendPagerDutyCertExpiry,
  },
  slack: {
    sendAlert: sendSlackAlert,
    sendRecovery: sendSlackRecovery,
    sendDegraded: sendSlackDegraded,
    sendCertExpiry: sendSlackCertExpiry,
  },
  webhook: {
    sendAlert: sendWebhookAlert,
    sendRecovery: sendWebhookRecovery,
    sendDegraded: sendWebhookDegraded,
    sendCertExpiry: sendWebhookCertExpiry,
  },
  telegram: {
    sendAlert: sendTelegramAlert,
    sendRecovery: sendTelegramRecovery,
    sendDegraded: sendTelegramDegraded,
    sendCertExpiry: sendTelegramCertExpiry,
  },
};
