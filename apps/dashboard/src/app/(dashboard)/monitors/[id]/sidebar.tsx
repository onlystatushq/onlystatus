"use client";

import type React from "react";
import { TableCellLink } from "@/components/data-table/table-cell-link";
import { SidebarRight } from "@/components/nav/sidebar-right";
import { monitorTypes } from "@/data/monitors.client";
import { formatMilliseconds } from "@/lib/formatter";
import { useTRPC } from "@/lib/trpc/client";
import { deserialize } from "@openstatus/assertions";
import { Badge } from "@openstatus/ui/components/ui/badge";
import { cn } from "@openstatus/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Logs, ShieldAlert, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export function Sidebar() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();
  const { data: monitor } = useQuery(
    trpc.monitor.get.queryOptions({ id: Number.parseInt(id) }),
  );

  const { data: certData } = useQuery({
    ...trpc.tinybird.certStatus.queryOptions({ monitorId: id }),
    enabled: !!monitor && monitor.jobType === "http",
    select: (res) => res?.data?.[0] ?? null,
  });

  if (!monitor) return null;

  const assertions = monitor.assertions ? deserialize(monitor.assertions) : [];
  const type = monitorTypes.find((type) => type.id === monitor.jobType);

  function getCertExpiryClassName(days: number) {
    if (days <= 1) return "text-destructive font-semibold";
    if (days <= 14) return "text-warning font-semibold";
    if (days <= 30) return "text-warning";
    return "text-success";
  }

  const certSection: {
    label: string;
    items: { label: string; value: React.ReactNode; isNested?: boolean }[];
  } | null =
    monitor.jobType === "http" && certData && certData.certExpiryDays != null
      ? {
          label: "Certificate",
          items: [
            {
              label: "Status",
              value: certData.certValid === 1 ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <ShieldCheck className="h-3 w-3" />
                  Valid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-warning">
                  <ShieldAlert className="h-3 w-3" />
                  Untrusted
                </span>
              ),
            },
            {
              label: "Expires In",
              value: (
                <span className={getCertExpiryClassName(certData.certExpiryDays)}>
                  {certData.certExpiryDays < 0
                    ? `Expired ${Math.abs(certData.certExpiryDays)}d ago`
                    : `${certData.certExpiryDays} days`}
                </span>
              ),
            },
            ...(certData.certIssuer
              ? [{ label: "Issuer", value: certData.certIssuer }]
              : []),
          ],
        }
      : null;

  return (
    <SidebarRight
      header="Monitor"
      metadata={[
        {
          label: "Overview",
          items: [
            {
              label: "External Name",
              value: monitor.externalName || monitor.name,
            },
            {
              label: "Status",
              // FIXME: dynamic
              value: <span className="text-success">Normal</span>,
            },
            {
              label: "Type",
              value: type ? (
                <span className="flex items-center gap-1">
                  <span className="uppercase">{type.label}</span>
                  <type.icon className="h-2.5 w-2.5 text-muted-foreground" />
                </span>
              ) : (
                <span className="uppercase">{monitor.jobType}</span>
              ),
            },
            {
              label: "Endpoint",
              value: monitor.url.replace(/^https?:\/\//, ""),
            },
            {
              label: "Regions",
              value:
                monitor.regions.length > 6
                  ? `${monitor.regions.length} regions`
                  : monitor.regions.join(", "),
            },
            {
              label: "Tags",
              value: (
                <div className="group/badges -space-x-2 flex flex-wrap">
                  {monitor.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="relative flex translate-x-0 items-center gap-1.5 rounded-full bg-background transition-transform hover:z-10 hover:translate-x-1"
                    >
                      <div
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ),
            },
          ],
        },
        ...(certSection ? [certSection] : []),
        {
          label: "Configuration",
          items: [
            { label: "Periodicity", value: monitor.periodicity },
            {
              label: "Timeout",
              value: formatMilliseconds(monitor.timeout),
            },
            { label: "Public", value: String(monitor.public) },
            { label: "Active", value: String(monitor.active) },
            {
              label: "Follow redirects",
              value: String(monitor.followRedirects),
            },
          ],
        },
        {
          label: "Notifications",
          items: monitor.notifications.flatMap((notification) => {
            const arr = [];
            arr.push({
              label: "Name",
              value: (
                <TableCellLink
                  // TODO: add the ?id= to the href and open the sheet
                  href={"/notifications"}
                  value={notification.name}
                />
              ),
            });
            arr.push({
              label: "Type",
              value: notification.provider,
              isNested: true,
            });
            arr.push({
              label: "Value",
              value: notification.data, // TODO: improve this based on the provider - we might wanna parse it!
              isNested: true,
            });
            return arr;
          }),
        },
        {
          label: "Assertions",
          items:
            assertions.length > 0
              ? assertions.flatMap((assertion) => {
                  const arr = [];

                  arr.push({
                    label: "Type",
                    value: assertion.schema.type,
                  });

                  arr.push({
                    label: "Compare",
                    value: assertion.schema.compare,
                    isNested: true,
                  });

                  if (
                    (assertion.schema.type === "header" ||
                      assertion.schema.type === "dnsRecord") &&
                    assertion.schema.key
                  ) {
                    arr.push({
                      label: "Key",
                      value: assertion.schema.key,
                      isNested: true,
                    });
                  }

                  arr.push({
                    label: "Value",
                    value: assertion.schema.target,
                    isNested: true,
                  });

                  return arr;
                })
              : [],
        },
        // {
        //   label: "Last Logs",
        //   items: [
        //     ...Array.from({ length: 20 }).map((_, index) => {
        //       const date = new Date(new Date().getTime() - index * 500000);
        //       return {
        //         label: [
        //           "Amsterdam",
        //           "Frankfurt",
        //           "New York",
        //           "Singapore",
        //           "Johannesburg",
        //         ][index % 5],
        //         value: (
        //           <div className="flex items-center justify-between gap-2">
        //             <CircleCheck className="h-4 w-4 text-success" />
        //             <TooltipProvider>
        //               <Tooltip>
        //                 <TooltipTrigger>
        //                   <span className="underline decoration-muted-foreground/50 decoration-dashed underline-offset-2">
        //                     {date.toLocaleTimeString("en-US", {
        //                       hour: "2-digit",
        //                       minute: "2-digit",
        //                     })}
        //                   </span>
        //                 </TooltipTrigger>
        //                 <TooltipContent align="center" side="left">
        //                   {date.toLocaleString("en-US")}
        //                 </TooltipContent>
        //               </Tooltip>
        //             </TooltipProvider>
        //           </div>
        //         ),
        //       };
        //     }),
        //   ],
        // },
      ]}
      footerButton={{
        onClick: () => router.push(`/monitors/${id}/logs`),
        children: (
          <>
            <Logs />
            <span>View all logs</span>
          </>
        ),
      }}
    />
  );
}
