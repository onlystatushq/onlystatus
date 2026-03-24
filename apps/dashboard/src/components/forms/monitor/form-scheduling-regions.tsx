"use client";

import { Link } from "@/components/common/link";
import {
  FormCard,
  FormCardContent,
  FormCardDescription,
  FormCardFooter,
  FormCardFooterInfo,
  FormCardHeader,
  FormCardSeparator,
  FormCardTitle,
} from "@/components/forms/form-card";
import { zodResolver } from "@hookform/resolvers/zod";
import { monitorPeriodicity } from "@openstatus/db/src/schema/constants";
import { Button } from "@openstatus/ui/components/ui/button";
import { Checkbox } from "@openstatus/ui/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openstatus/ui/components/ui/form";
import { Slider } from "@openstatus/ui/components/ui/slider";
import { cn } from "@openstatus/ui/lib/utils";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Note, NoteButton } from "@/components/common/note";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { isTRPCClientError } from "@trpc/client";
import { CircleX, Globe, Server } from "lucide-react";

const DEFAULT_PERIODICITY = "10m";
const DEFAULT_REGIONS = ["local"];
const PERIODICITY = monitorPeriodicity.filter((p) => p !== "other");
const DEFAULT_PRIVATE_LOCATIONS = [] satisfies { id: number; name: string }[];

const schema = z
  .object({
    regions: z.array(z.string()),
    periodicity: z.enum(monitorPeriodicity),
    privateLocations: z.array(z.number()),
  })
  .refine((data) => data.regions.length > 0 || data.privateLocations.length > 0, {
    message: "Select at least one check location",
    path: ["regions"],
  });

type FormValues = z.infer<typeof schema>;

export function FormSchedulingRegions({
  defaultValues,
  onSubmit,
  privateLocations,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  privateLocations: { id: number; name: string }[];
}) {
  const trpc = useTRPC();
  const { data: workspace } = useQuery(trpc.workspace.get.queryOptions());
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {
      regions: DEFAULT_REGIONS,
      periodicity: DEFAULT_PERIODICITY,
      privateLocations: DEFAULT_PRIVATE_LOCATIONS,
    },
  });
  const [isPending, startTransition] = useTransition();
  const watchPeriodicity = form.watch("periodicity");
  const watchPrivateLocations = form.watch("privateLocations");

  function submitAction(values: FormValues) {
    if (isPending) return;

    startTransition(async () => {
      try {
        const promise = onSubmit(values);
        toast.promise(promise, {
          loading: "Saving...",
          success: () => "Saved",
          error: (error) => {
            if (isTRPCClientError(error)) {
              return error.message;
            }
            console.error(error);
            return "Failed to save";
          },
        });
        await promise;
      } catch (error) {
        console.error(error);
      }
    });
  }

  if (!workspace) return null;

  const periodicity = workspace.limits.periodicity;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitAction)} {...props}>
        <FormCard>
          <FormCardHeader>
            <FormCardTitle>Scheduling & Locations</FormCardTitle>
            <FormCardDescription>
              Configure the check frequency and monitoring locations.
            </FormCardDescription>
          </FormCardHeader>
          <FormCardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="periodicity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <FormControl>
                    <div>
                      <Slider
                        value={[monitorPeriodicity.indexOf(field.value)]}
                        max={PERIODICITY.length - 1}
                        aria-label="Slider with ticks"
                        onValueChange={(value) => {
                          field.onChange(PERIODICITY[value[0]]);
                        }}
                        className={cn(
                          !periodicity.includes(watchPeriodicity) &&
                            "[&_[data-slot=slider-range]]:bg-destructive",
                        )}
                      />
                      <span
                        className="mt-3 flex w-full items-center justify-between gap-1 px-2.5 font-medium text-muted-foreground text-xs"
                        aria-hidden="true"
                      >
                        {PERIODICITY.map((period) => (
                          <span
                            key={period}
                            className="flex w-0 flex-col items-center justify-center gap-2"
                          >
                            <span
                              className={cn("h-1 w-px bg-muted-foreground/70")}
                            />
                            {period}
                          </span>
                        ))}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!periodicity.includes(watchPeriodicity) ? (
              <Note color="error">
                <CircleX />
                The selected frequency is not available on your plan.
              </Note>
            ) : null}
          </FormCardContent>
          <FormCardSeparator />
          <FormCardContent className="grid gap-4">
            <FormLabel>Locations</FormLabel>
            <FormField
              control={form.control}
              name="regions"
              render={({ field }) => {
                const hasLocal = field.value.includes("local");
                return (
                  <div className="flex items-center gap-2 rounded-md border p-3">
                    <Server className="size-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">Local Checker</span>
                      <span className="text-muted-foreground text-xs">
                        Built-in checker running alongside your instance
                      </span>
                    </div>
                    <Checkbox
                      checked={hasLocal}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked
                            ? [...field.value, "local"]
                            : field.value.filter((r: string) => r !== "local"),
                        );
                      }}
                      className="ml-auto"
                    />
                  </div>
                );
              }}
            />
            {privateLocations.length === 0 ? (
              <Note>
                <Globe />
                Deploy checkers to additional locations for distributed
                monitoring.
                <NoteButton variant="outline" asChild>
                  <Link href="/private-locations">Set up locations</Link>
                </NoteButton>
              </Note>
            ) : (
              <FormField
                control={form.control}
                name="privateLocations"
                render={() => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        Private Locations{" "}
                        <span className="align-baseline font-mono font-normal text-muted-foreground/70 text-xs tabular-nums">
                          ({watchPrivateLocations.length}/
                          {privateLocations.length})
                        </span>
                      </FormLabel>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        className={cn(
                          watchPrivateLocations.length ===
                            privateLocations.length && "text-muted-foreground",
                        )}
                        onClick={() => {
                          const allSelected = privateLocations.every((item) =>
                            watchPrivateLocations.includes(item.id),
                          );

                          if (!allSelected) {
                            form.setValue(
                              "privateLocations",
                              privateLocations.map((item) => item.id),
                            );
                          } else {
                            form.setValue("privateLocations", []);
                          }
                        }}
                      >
                        Select all
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {privateLocations.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="privateLocations"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex items-center"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={
                                      field.value?.includes(item.id) || false
                                    }
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            item.id,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item.id,
                                            ),
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="w-full truncate font-mono font-normal text-sm">
                                  {item.name}
                                  <Globe className="size-3" />
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </FormCardContent>
          <FormCardFooter>
            <FormCardFooterInfo />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit"}
            </Button>
          </FormCardFooter>
        </FormCard>
      </form>
    </Form>
  );
}
