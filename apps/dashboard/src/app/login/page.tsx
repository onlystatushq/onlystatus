"use client";

import { useState } from "react";
import { Button } from "@openstatus/ui/components/ui/button";
import { Input } from "@openstatus/ui/components/ui/input";
import { Label } from "@openstatus/ui/components/ui/label";
import { useSearchParams } from "next/navigation";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getPasskeyLoginOptions,
  signInWithCredentialsAction,
  signInWithPasskeyAction,
} from "./_components/actions";

type LoginState = "idle" | "submitting" | "totp_required" | "error";
type Mode = "login" | "first_time_setup";

export default function Page() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const trpc = useTRPC();

  const { data: hasUsersData, isLoading } = useQuery(
    trpc.auth.hasUsers.queryOptions(),
  );

  const { data: passkeyData } = useQuery(
    trpc.auth.hasPasskeys.queryOptions(),
  );

  const registerMutation = useMutation(
    trpc.auth.register.mutationOptions(),
  );

  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  // First-time setup fields
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mode: Mode =
    !isLoading && !hasUsersData?.hasUsers ? "first_time_setup" : "login";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setError(null);

    const result = await signInWithCredentialsAction({
      email,
      password,
      totpCode: state === "totp_required" ? totpCode : undefined,
      redirectTo: redirectTo ?? undefined,
    });

    if (result?.error === "TOTP_REQUIRED") {
      setState("totp_required");
      return;
    }

    if (result?.error) {
      setError(result.error);
      setState("error");
      return;
    }
  }

  async function handlePasskeyLogin() {
    setState("submitting");
    setError(null);

    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const options = await getPasskeyLoginOptions();
      const assertion = await startAuthentication({ optionsJSON: options });
      const result = await signInWithPasskeyAction(
        assertion,
        redirectTo ?? undefined,
      );

      if (result?.error) {
        setError(result.error);
        setState("error");
      }
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        setState("idle");
        return;
      }
      setError("Passkey authentication failed.");
      setState("error");
    }
  }

  async function handleFirstTimeSetup(e: React.FormEvent) {
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

    setState("submitting");

    try {
      await registerMutation.mutateAsync({ name, email, password });

      const result = await signInWithCredentialsAction({
        email,
        password,
        redirectTo: "/onboarding",
      });

      if (result?.error) {
        setError(result.error);
        setState("error");
        return;
      }
    } catch (err: any) {
      setError(err.message || "Registration failed.");
      setState("error");
    }
  }

  if (isLoading) return null;

  if (mode === "first_time_setup") {
    return (
      <div className="my-4 grid w-full max-w-lg gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="font-semibold text-3xl tracking-tight">
            First Time Setup
          </h1>
          <p className="text-muted-foreground text-sm">
            Create your admin account to get started.
          </p>
        </div>
        <form onSubmit={handleFirstTimeSetup} className="grid gap-4 p-4">
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

          <Button type="submit" disabled={state === "submitting"}>
            {state === "submitting" ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="my-4 grid w-full max-w-lg gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-semibold text-3xl tracking-tight">Sign In</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to your account.
        </p>
      </div>
      {passkeyData?.hasPasskeys && state !== "totp_required" && (
        <div className="grid gap-4 px-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handlePasskeyLogin}
            disabled={state === "submitting"}
          >
            Sign in with passkey
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with password
              </span>
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleLogin} className="grid gap-4 p-4">
        {state !== "totp_required" ? (
          <>
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
                autoComplete="current-password"
              />
            </div>
          </>
        ) : (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground text-center">
              {useRecoveryCode
                ? "Enter one of your recovery codes."
                : "Enter the 6-digit code from your authenticator app."}
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="totpCode">
                {useRecoveryCode ? "Recovery Code" : "Authentication Code"}
              </Label>
              <Input
                id="totpCode"
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
                autoComplete="one-time-code"
                placeholder={useRecoveryCode ? "XXXXXXXX" : "000000"}
                className="text-center tracking-widest"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setUseRecoveryCode(!useRecoveryCode);
                setTotpCode("");
              }}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary hover:no-underline"
            >
              {useRecoveryCode
                ? "Use authenticator code"
                : "Use a recovery code"}
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button type="submit" disabled={state === "submitting"}>
          {state === "submitting"
            ? "Signing in..."
            : state === "totp_required"
              ? "Verify"
              : "Sign In"}
        </Button>

        {state === "totp_required" && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setState("idle");
              setTotpCode("");
              setError(null);
            }}
          >
            Back to login
          </Button>
        )}
      </form>
      {process.env.NEXT_PUBLIC_ALLOW_PUBLIC_REGISTRATION === "true" && (
        <p className="px-8 text-center text-muted-foreground text-sm">
          Don't have an account?{" "}
          <a
            href="/register"
            className="underline underline-offset-4 hover:text-primary hover:no-underline"
          >
            Create account
          </a>
        </p>
      )}
    </div>
  );
}
