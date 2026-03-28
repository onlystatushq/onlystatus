"use client";

import {
  ActionCard,
  ActionCardDescription,
  ActionCardHeader,
  ActionCardTitle,
} from "@/components/content/action-card";
import { ActionCardGroup } from "@/components/content/action-card";
import {
  EmptyStateContainer,
  EmptyStateTitle,
} from "@/components/content/empty-state";
import {
  Section,
  SectionDescription,
  SectionGroup,
  SectionHeader,
  SectionTitle,
} from "@/components/content/section";
import { columns } from "@/components/data-table/notifications/columns";
import { FormSheetNotifier } from "@/components/forms/notifications/sheet";
import { DataTable } from "@/components/ui/data-table/data-table";
import { config } from "@/data/notifications.client";
import { useTRPC } from "@/lib/trpc/client";
import { Alert, AlertDescription } from "@openstatus/ui/components/ui/alert";
import { useMutation, useQuery } from "@tanstack/react-query";
import { InfoIcon } from "lucide-react";
import { useQueryStates } from "nuqs";
import { searchParamsParsers } from "./search-params";

export function Client() {
  const trpc = useTRPC();
  const { data: notifications, refetch } = useQuery(
    trpc.notification.list.queryOptions(),
  );
  const [searchParams] = useQueryStates(searchParamsParsers);
  const { data: monitors } = useQuery(trpc.monitor.list.queryOptions());
  const createNotifierMutation = useMutation(
    trpc.notification.new.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  if (!notifications || !monitors) return null;

  return (
    <SectionGroup>
      <SectionHeader>
        <SectionTitle>Notifications</SectionTitle>
        <SectionDescription>
          Define your notifications to receive alerts when downtime occurs.
        </SectionDescription>
      </SectionHeader>
      <Section>
        {notifications.length === 0 ? (
          <EmptyStateContainer>
            <EmptyStateTitle>No notifier found</EmptyStateTitle>
          </EmptyStateContainer>
        ) : (
          <DataTable columns={columns} data={notifications} />
        )}
      </Section>
      <Section>
        <SectionHeader>
          <SectionTitle>Create a new notifier</SectionTitle>
          <SectionDescription>
            Define your notifications to receive alerts when downtime occurs.
          </SectionDescription>
        </SectionHeader>
        <Alert variant="default" className="mb-4">
          <InfoIcon className="size-4" />
          <AlertDescription>
            Webhook, Slack, Discord, and Email work out of the box. Other
            providers (PagerDuty, OpsGenie, Grafana OnCall, Telegram) require
            accounts with those services.
          </AlertDescription>
        </Alert>
        <ActionCardGroup className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Object.keys(config).map((notifier) => {
            const key = notifier as keyof typeof config;
            const Icon = config[key].icon;

            return (
              <FormSheetNotifier
                key={notifier}
                provider={key}
                monitors={monitors}
                defaultOpen={searchParams.channel === key}
                onSubmit={async (values) => {
                  await createNotifierMutation.mutateAsync({
                    provider: key,
                    name: values.name,
                    data: { [key]: values.data },
                    monitors: values.monitors,
                  });
                }}
              >
                <ActionCard className="h-full w-full">
                  <ActionCardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-md border border-border bg-muted">
                        <Icon className="size-3" />
                      </div>
                      <ActionCardTitle>{config[key].label}</ActionCardTitle>
                    </div>
                    <ActionCardDescription>
                      Send notifications to {config[key].label}
                    </ActionCardDescription>
                  </ActionCardHeader>
                </ActionCard>
              </FormSheetNotifier>
            );
          })}
        </ActionCardGroup>
      </Section>
    </SectionGroup>
  );
}
