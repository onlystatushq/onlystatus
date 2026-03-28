"use client";

import { Checkbox } from "@openstatus/ui/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openstatus/ui/components/ui/form";

import {
  FormCardContent,
  FormCardSeparator,
} from "@/components/forms/form-card";
import { useFormSheetDirty } from "@/components/forms/form-sheet";
import { config } from "@/data/notifications.client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@openstatus/ui/components/ui/button";
import { Form } from "@openstatus/ui/components/ui/form";
import { Input } from "@openstatus/ui/components/ui/input";
import { Label } from "@openstatus/ui/components/ui/label";
import { cn } from "@openstatus/ui/lib/utils";
import { isTRPCClientError } from "@trpc/client";
import React, { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  provider: z.literal("pagerduty"),
  data: z.string(),
  monitors: z.array(z.number()),
});

type FormValues = z.infer<typeof schema>;

function buildPagerDutyData(integrationKey: string): string {
  return JSON.stringify({
    integration_keys: [
      {
        integration_key: integrationKey,
        name: "default",
        id: "default",
        type: "events_api_v2",
      },
    ],
    account: { subdomain: "self-hosted", name: "Self-hosted" },
  });
}

function extractIntegrationKey(data: string): string {
  try {
    const parsed = JSON.parse(data);
    return parsed?.integration_keys?.[0]?.integration_key ?? "";
  } catch {
    return "";
  }
}

export function FormPagerDuty({
  monitors,
  defaultValues,
  onSubmit,
  className,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  monitors: { id: number; name: string }[];
}) {
  const existingKey = defaultValues?.data
    ? extractIntegrationKey(defaultValues.data)
    : "";

  const [integrationKey, setIntegrationKey] = React.useState(existingKey);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {
      name: "",
      provider: "pagerduty",
      data: "",
      monitors: [],
    },
  });
  const [isPending, startTransition] = useTransition();
  const { setIsDirty } = useFormSheetDirty();

  const formIsDirty = form.formState.isDirty;
  React.useEffect(() => {
    setIsDirty(formIsDirty || integrationKey !== existingKey);
  }, [formIsDirty, integrationKey, existingKey, setIsDirty]);

  function handleKeyChange(value: string) {
    setIntegrationKey(value);
    if (value.trim()) {
      form.setValue("data", buildPagerDutyData(value.trim()), {
        shouldDirty: true,
      });
    } else {
      form.setValue("data", "", { shouldDirty: true });
    }
  }

  function submitAction(values: FormValues) {
    if (isPending) return;

    startTransition(async () => {
      try {
        const promise = onSubmit(values);
        toast.promise(promise, {
          loading: "Saving...",
          success: "Saved",
          error: (error) => {
            if (isTRPCClientError(error)) {
              return error.message;
            }
            return "Failed to save";
          },
        });
        await promise;
      } catch (error) {
        console.error(error);
      }
    });
  }

  function testAction() {
    if (isPending) return;

    startTransition(async () => {
      try {
        if (!integrationKey.trim()) {
          toast.error("Enter an integration key first");
          return;
        }
        const promise = config.pagerduty.sendTest({
          integrationKey: integrationKey.trim(),
        });
        toast.promise(promise, {
          loading: "Sending test...",
          success: "Test sent",
          error: (error) => {
            if (error instanceof Error) {
              return error.message;
            }
            return "Failed to send test";
          },
        });
        await promise;
      } catch (error) {
        console.error(error);
      }
    });
  }

  return (
    <Form {...form}>
      <form
        className={cn("grid gap-4", className)}
        onSubmit={form.handleSubmit(submitAction)}
        {...props}
      >
        <FormCardContent className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="My Notifier" {...field} />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Enter a descriptive name for your notifier.
                </FormDescription>
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Integration Key</FormLabel>
            <FormControl>
              <Input
                placeholder="your-events-api-v2-integration-key"
                value={integrationKey}
                onChange={(e) => handleKeyChange(e.target.value)}
              />
            </FormControl>
            <FormDescription>
              Create an Events API v2 integration in your PagerDuty service,
              then paste the integration key here.
            </FormDescription>
          </FormItem>
          <div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={testAction}
            >
              Send Test
            </Button>
          </div>
        </FormCardContent>
        <FormCardSeparator />
        <FormCardContent>
          <FormField
            control={form.control}
            name="monitors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monitors</FormLabel>
                <FormDescription>
                  Select the monitors you want to notify.
                </FormDescription>
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        id="all"
                        checked={field.value?.length === monitors.length}
                        onCheckedChange={(checked) => {
                          field.onChange(
                            checked ? monitors.map((m) => m.id) : [],
                          );
                        }}
                      />
                    </FormControl>
                    <Label htmlFor="all">Select all</Label>
                  </div>
                  {monitors.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          id={String(item.id)}
                          checked={field.value?.includes(item.id)}
                          onCheckedChange={(checked) => {
                            const newValue = checked
                              ? [...(field.value || []), item.id]
                              : field.value?.filter((id) => id !== item.id);
                            field.onChange(newValue);
                          }}
                        />
                      </FormControl>
                      <Label htmlFor={String(item.id)}>{item.name}</Label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormCardContent>
      </form>
    </Form>
  );
}
