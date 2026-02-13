"use client";

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

import { Label } from "@openstatus/ui/components/ui/label";

import { InputWithAddons } from "@/components/common/input-with-addons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@openstatus/ui/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";

import DomainConfiguration from "@/components/domains/domain-configuration";
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "@openstatus/ui/components/ui/form";
import { isTRPCClientError } from "@trpc/client";
import type React from "react";
import { useTransition } from "react";
import { toast } from "sonner";

const schema = z.object({
  domain: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function FormCustomDomain({
  defaultValues,
  onSubmit,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {
      domain: undefined,
    },
  });
  const [isPending, startTransition] = useTransition();

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
            return "Failed to save";
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
      <form onSubmit={form.handleSubmit(submitAction)} {...props}>
        <FormCard>
          <FormCardHeader>
            <FormCardTitle>Custom Domain</FormCardTitle>
            <FormCardDescription>
              Use your own domain for your status page. Custom domains require
              manual reverse proxy configuration.
            </FormCardDescription>
          </FormCardHeader>
          <FormCardContent>
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <Label>Domain</Label>
                  <InputWithAddons
                    placeholder="status.example.com"
                    leading="https://"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormCardContent>
          {defaultValues?.domain ? (
            <>
              <FormCardSeparator />
              <FormCardContent>
                <DomainConfiguration domain={defaultValues?.domain} />
              </FormCardContent>
            </>
          ) : null}
          <FormCardFooter>
            <FormCardFooterInfo>
              Point your domain to your status page host via DNS and a reverse
              proxy.
            </FormCardFooterInfo>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Submitting..." : "Submit"}
            </Button>
          </FormCardFooter>
        </FormCard>
      </form>
    </Form>
  );
}
