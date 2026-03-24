"use client";

import {
  FormCard,
  FormCardContent,
  FormCardDescription,
  FormCardFooter,
  FormCardFooterInfo,
  FormCardHeader,
  FormCardTitle,
} from "@/components/forms/form-card";
import { useTRPC } from "@/lib/trpc/client";
import { Button } from "@openstatus/ui/components/ui/button";
import { Input } from "@openstatus/ui/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(64, "Slug must be at most 64 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Lowercase alphanumeric with hyphens only",
  );

type FormValues = { slug: string };

export function FormSlug({ defaultValues }: { defaultValues?: FormValues }) {
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [error, setError] = useState<string | null>(null);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isDirty = slug !== (defaultValues?.slug ?? "");

  const updateSlug = useMutation(
    trpc.workspace.updateSlug.mutationOptions({
      onSuccess: () => {
        toast.success("Slug updated");
        queryClient.invalidateQueries({
          queryKey: trpc.workspace.getWorkspace.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.workspace.list.queryKey(),
        });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update slug");
      },
    }),
  );

  function handleSubmit() {
    const result = slugSchema.safeParse(slug);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setError(null);
    updateSlug.mutate({ slug });
  }

  return (
    <FormCard>
      <FormCardHeader>
        <FormCardTitle>Slug</FormCardTitle>
        <FormCardDescription>
          The unique slug for your workspace.
        </FormCardDescription>
      </FormCardHeader>
      <FormCardContent>
        <Input
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            setError(null);
          }}
          placeholder="my-workspace"
          className="max-w-xs font-mono text-sm"
        />
        {error ? (
          <p className="mt-1 text-destructive text-xs">{error}</p>
        ) : null}
      </FormCardContent>
      <FormCardFooter>
        <FormCardFooterInfo>
          Used when interacting with the API.
        </FormCardFooterInfo>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!isDirty || updateSlug.isPending}
        >
          {updateSlug.isPending ? "Saving..." : "Save"}
        </Button>
      </FormCardFooter>
    </FormCard>
  );
}
