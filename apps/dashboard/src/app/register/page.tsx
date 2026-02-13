"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@openstatus/ui/components/ui/button";
import { Input } from "@openstatus/ui/components/ui/input";
import { Label } from "@openstatus/ui/components/ui/label";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { signInWithCredentialsAction } from "../login/_components/actions";

export default function Page() {
  const router = useRouter();
  const trpc = useTRPC();

  const { data: hasUsersData, isLoading } = useQuery(
    trpc.auth.hasUsers.queryOptions(),
  );

  const registerMutation = useMutation(
    trpc.auth.register.mutationOptions(),
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If users exist and public registration is disabled, redirect to login
  // (Server-side check is in the tRPC endpoint, but we can hint here)
  if (!isLoading && hasUsersData?.hasUsers) {
    // Public registration might be disabled server-side; we still show the form
    // and let the server reject if needed
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await registerMutation.mutateAsync({ name, email, password });

      // Auto-login after registration
      const result = await signInWithCredentialsAction({
        email,
        password,
        redirectTo: "/onboarding",
      });

      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      // Redirect handled by signIn action
    } catch (err: any) {
      setError(err.message || "Registration failed.");
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  return (
    <div className="my-4 grid w-full max-w-lg gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-semibold text-3xl tracking-tight">
          Create Account
        </h1>
        <p className="text-muted-foreground text-sm">
          {!hasUsersData?.hasUsers
            ? "Set up your monitoring platform."
            : "Create your account to get started."}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            autoComplete="new-password"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={12}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create Account"}
        </Button>
      </form>
      <p className="px-8 text-center text-muted-foreground text-sm">
        Already have an account?{" "}
        <a
          href="/login"
          className="underline underline-offset-4 hover:text-primary hover:no-underline"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
