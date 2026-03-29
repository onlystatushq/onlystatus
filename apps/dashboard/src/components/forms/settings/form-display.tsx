"use client";

import {
  FormCard,
  FormCardContent,
  FormCardDescription,
  FormCardFooter,
  FormCardHeader,
  FormCardTitle,
} from "@/components/forms/form-card";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@openstatus/ui/components/ui/alert";
import { Button } from "@openstatus/ui/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@openstatus/ui/components/ui/form";
import { Switch } from "@openstatus/ui/components/ui/switch";
import { getEnv } from "@openstatus/utils";
import { InfoIcon } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  showGithubNav: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function FormDisplay({
  defaultValues,
  onSubmit,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  defaultValues?: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const envOverride = getEnv("NEXT_PUBLIC_SHOW_GITHUB_NAV") === "false";
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {
      showGithubNav: true,
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
          error: "Failed to save",
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
            <FormCardTitle>Display</FormCardTitle>
            <FormCardDescription>
              Customize what appears in the dashboard navigation.
            </FormCardDescription>
          </FormCardHeader>
          <FormCardContent className="grid gap-4">
            {envOverride && (
              <Alert variant="default">
                <InfoIcon className="size-4" />
                <AlertDescription>
                  GitHub navigation is disabled by the server administrator via
                  environment variable. This setting has no effect while the
                  override is active.
                </AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="showGithubNav"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <FormLabel>GitHub and Issues links</FormLabel>
                    <FormDescription>
                      Show GitHub repository and issues links in the navigation
                      bar.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={envOverride}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </FormCardContent>
          <FormCardFooter>
            <Button type="submit" disabled={isPending || envOverride} size="sm">
              {isPending ? "Submitting..." : "Submit"}
            </Button>
          </FormCardFooter>
        </FormCard>
      </form>
    </Form>
  );
}
