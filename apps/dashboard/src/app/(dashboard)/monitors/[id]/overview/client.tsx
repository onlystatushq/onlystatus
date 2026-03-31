"use client";

import { ChartAreaLatency } from "@/components/chart/chart-area-latency";
import { ChartAreaTimingPhases } from "@/components/chart/chart-area-timing-phases";
import { ChartBarUptime } from "@/components/chart/chart-bar-uptime";
import { ChartLineRegions } from "@/components/chart/chart-line-regions";
import {
  Section,
  SectionDescription,
  SectionGroup,
  SectionHeader,
  SectionTitle,
} from "@/components/content/section";
import { ButtonReset } from "@/components/controls-search/button-reset";
import { CommandRegion } from "@/components/controls-search/command-region";
import { DropdownInterval } from "@/components/controls-search/dropdown-interval";
import { DropdownPercentile } from "@/components/controls-search/dropdown-percentile";
import { DropdownPeriod } from "@/components/controls-search/dropdown-period";
import { AuditLogsWrapper } from "@/components/data-table/audit-logs/wrapper";
import { getColumns as getRegionColumns } from "@/components/data-table/response-logs/regions/columns";
import { GlobalUptimeSection } from "@/components/metric/global-uptime/section";
import { PopoverQuantile } from "@/components/popovers/popover-quantile";
import { PopoverResolution } from "@/components/popovers/popover-resolution";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTablePagination } from "@/components/ui/data-table/data-table-pagination";
import { mapRegionMetrics } from "@/data/metrics.client";
import { periodToFromDate } from "@/data/metrics.client";
import type { RegionMetric } from "@/data/region-metrics";
import { useTRPC } from "@/lib/trpc/client";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openstatus/ui/components/ui/tabs";
import { cn } from "@openstatus/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { endOfDay, format } from "date-fns";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import React, { useMemo } from "react";
import { searchParamsParsers } from "./search-params";

const TIMELINE_INTERVAL = 30; // in days

export function Client() {
  const trpc = useTRPC();
  const { id } = useParams<{ id: string }>();
  const [{ period, regions, percentile, interval }] =
    useQueryStates(searchParamsParsers);
  const { data: monitor } = useQuery(
    trpc.monitor.get.queryOptions({ id: Number.parseInt(id) }),
  );

  const { data: certData } = useQuery({
    ...trpc.tinybird.certStatus.queryOptions({ monitorId: id }),
    enabled: !!monitor && monitor.jobType === "http",
    select: (res) => res?.data?.[0] ?? null,
  });

  // Default to monitor's configured regions + private locations when no explicit filter
  const selectedRegions = regions ?? (monitor ? [
    ...monitor.regions,
    ...(monitor.privateLocations?.map((l) => l.id.toString()) ?? []),
  ] : undefined);
  const fromDate = periodToFromDate[period];
  const toDate = endOfDay(new Date());

  const regionTimelineQuery = {
    ...trpc.tinybird.metricsRegions.queryOptions({
      monitorId: id,
      period: period,
      type: (monitor?.jobType ?? "http") as "http" | "tcp",
      regions: selectedRegions,
      // Request 30-minute buckets by default
      interval: 30,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    }),
    enabled: !!monitor,
    refetchInterval: 30_000,
  } as const;

  const { data: regionTimeline, isLoading } = useQuery(regionTimelineQuery);

  const activeRegions = useMemo(() => [
    ...(monitor?.regions ?? []),
    ...(monitor?.privateLocations?.map((location) =>
      location.id.toString(),
    ) ?? []),
  ], [monitor?.regions, monitor?.privateLocations]);

  const regionMetrics: RegionMetric[] = React.useMemo(() => {
    return mapRegionMetrics(
      regionTimeline,
      activeRegions,
      percentile,
    );
  }, [regionTimeline, activeRegions, percentile]);

  const regionColumns = useMemo(
    () => getRegionColumns(monitor?.privateLocations ?? []),
    [monitor?.privateLocations],
  );

  function getCertExpiryClassName(days: number) {
    if (days <= 1) return "text-destructive font-semibold";
    if (days <= 14) return "text-warning font-semibold";
    if (days <= 30) return "text-warning";
    return "text-success";
  }

  if (!monitor) return null;

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>{monitor.name}</SectionTitle>
          <SectionDescription>
            {monitor.jobType === "http" ? (
              <a href={monitor.url} target="_blank" rel="noopener noreferrer">
                {monitor.url}
              </a>
            ) : (
              monitor.url
            )}
          </SectionDescription>
        </SectionHeader>
        <div className="flex flex-wrap gap-2">
          <div>
            <DropdownPeriod /> including{" "}
            <CommandRegion
              regions={monitor.regions}
              privateLocations={monitor.privateLocations}
            />
          </div>
          <div>
            <ButtonReset only={["period", "regions"]} />
          </div>
        </div>
        {certData && certData.certExpiryDays != null && (
          <div className="flex items-center gap-4 rounded-lg border p-4">
            {certData.certValid === 1 ? (
              <ShieldCheck className={cn(
                "h-8 w-8 shrink-0",
                getCertExpiryClassName(certData.certExpiryDays),
              )} />
            ) : (
              <ShieldAlert className="h-8 w-8 shrink-0 text-warning" />
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                SSL Certificate
              </p>
              <p className={cn("text-2xl font-bold", getCertExpiryClassName(certData.certExpiryDays))}>
                {certData.certExpiryDays < 0
                  ? `Expired ${Math.abs(certData.certExpiryDays)}d ago`
                  : `${certData.certExpiryDays} days`}
              </p>
            </div>
            <div className="ml-auto text-right text-sm text-muted-foreground">
              {certData.certIssuer && <p>Issuer: {certData.certIssuer}</p>}
              {certData.certExpiresAt && (
                <p>Expires: {format(new Date(certData.certExpiresAt), "MMM d, yyyy")}</p>
              )}
            </div>
          </div>
        )}
        <GlobalUptimeSection
          monitorId={id}
          jobType={monitor.jobType as "http" | "tcp"}
          period={period}
          regions={selectedRegions}
        />
      </Section>
      <Section>
        <SectionHeader>
          <SectionTitle>Uptime</SectionTitle>
          <SectionDescription>
            Uptime accross all the selected regions
          </SectionDescription>
        </SectionHeader>
        <ChartBarUptime
          monitorId={id}
          type={monitor.jobType as "http" | "tcp"}
          period={period}
          regions={selectedRegions}
        />
      </Section>
      <Section>
        {/* TODO: based on http, we have Timing Phases instead of Latency */}
        <SectionHeader>
          <SectionTitle>Latency</SectionTitle>
          <SectionDescription>
            Response time accross all the regions
          </SectionDescription>
        </SectionHeader>
        <div className="flex flex-wrap gap-2">
          <div>
            The <DropdownPercentile />{" "}
            <PopoverQuantile>quantile</PopoverQuantile> within a{" "}
            <DropdownInterval />{" "}
            <PopoverResolution>resolution</PopoverResolution>
          </div>
          <div>
            <ButtonReset only={["percentile", "interval"]} />
          </div>
        </div>
        {monitor.jobType === "http" ? (
          <ChartAreaTimingPhases
            monitorId={id}
            degradedAfter={monitor.degradedAfter}
            type={monitor.jobType as "http"}
            period={period}
            percentile={percentile}
            interval={interval}
            regions={selectedRegions}
          />
        ) : (
          <ChartAreaLatency
            monitorId={id}
            percentile={percentile}
            degradedAfter={monitor.degradedAfter}
            type={monitor.jobType as "http" | "tcp"}
            period={period}
            regions={selectedRegions}
          />
        )}
      </Section>
      <Section>
        <SectionHeader>
          <SectionTitle>Regions</SectionTitle>
          <SectionDescription>
            Every selected region&apos;s latency trend
          </SectionDescription>
        </SectionHeader>
        <div className="flex flex-wrap gap-2">
          <div>
            The <DropdownPercentile />{" "}
            <PopoverQuantile>quantile</PopoverQuantile> trend over the{" "}
            <DropdownPeriod />
          </div>
          <div>
            <ButtonReset only={["percentile", "period"]} />
          </div>
        </div>
        <Tabs defaultValue="table">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="chart">Chart</TabsTrigger>
          </TabsList>
          <TabsContent value="table">
            <DataTable
              data={regionMetrics}
              columns={regionColumns}
              paginationComponent={({ table }) => (
                <DataTablePagination table={table} />
              )}
            />
          </TabsContent>
          <TabsContent value="chart">
            <ChartLineRegions
              className="mt-3"
              regions={regionMetrics.map((region) => region.region)}
              privateLocations={monitor?.privateLocations ?? []}
              data={regionMetrics.reduce(
                (acc, region) => {
                  region.trend.forEach((t) => {
                    const existing = acc.find(
                      (d) => d.timestamp === t.timestamp,
                    );
                    if (existing) {
                      existing[region.region] = t[region.region];
                    } else {
                      acc.push({
                        timestamp: t.timestamp,
                        [region.region]: t[region.region],
                      });
                    }
                  });
                  return acc;
                },
                [] as { timestamp: number; [key: string]: number }[],
              )}
            />
          </TabsContent>
        </Tabs>
      </Section>
      <Section>
        <SectionHeader>
          <SectionTitle>Timeline</SectionTitle>
          <SectionDescription>
            What happened to your monitor over the last {TIMELINE_INTERVAL} days
          </SectionDescription>
        </SectionHeader>
        <AuditLogsWrapper monitorId={id} interval={TIMELINE_INTERVAL} />
      </Section>
    </SectionGroup>
  );
}
