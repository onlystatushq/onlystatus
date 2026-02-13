"use client";

import {
  Section,
  SectionGroup,
  SectionHeader,
  SectionTitle,
} from "@/components/content/section";
import {
  FormCardDescription,
  FormCardFooterInfo,
  FormCardHeader,
  FormCardTitle,
} from "@/components/forms/form-card";
import {
  FormCard,
  FormCardContent,
  FormCardFooter,
} from "@/components/forms/form-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTRPC } from "@/lib/trpc/client";
import { Badge } from "@openstatus/ui/components/ui/badge";
import { Button } from "@openstatus/ui/components/ui/button";
import { Input } from "@openstatus/ui/components/ui/input";
import { Label } from "@openstatus/ui/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
} from "@/lib/auth/webauthn-actions";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

export default function Page() {
  const trpc = useTRPC();
  const { data: user } = useQuery(trpc.user.get.queryOptions());

  if (!user) return null;

  return (
    <SectionGroup>
      <Section>
        <SectionHeader>
          <SectionTitle>Account</SectionTitle>
        </SectionHeader>
        {user.forcePasswordChange ? (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 mb-4">
            <p className="text-sm font-medium text-destructive">
              You must change your password before accessing other settings.
            </p>
          </div>
        ) : null}
        <PasswordChangeCard />
        {!user.forcePasswordChange && (
          <>
            <TwoFactorCard enabled={!!user.totpEnabled} />
            <PasskeyCard />
            <FormCard>
              <FormCardHeader>
                <FormCardTitle>Personal Information</FormCardTitle>
                <FormCardDescription>
                  Manage your personal information.
                </FormCardDescription>
              </FormCardHeader>
              <FormCardContent>
                <form className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label>Name</Label>
                    <Input defaultValue={user?.name ?? undefined} disabled />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Email</Label>
                    <Input defaultValue={user?.email ?? undefined} disabled />
                  </div>
                </form>
              </FormCardContent>
              <FormCardFooter className="[&>:last-child]:ml-0">
                <FormCardFooterInfo>
                  Please contact us if you want to change your email or name.
                </FormCardFooterInfo>
              </FormCardFooter>
            </FormCard>
            <FormCard>
              <FormCardHeader>
                <FormCardTitle>Appearance</FormCardTitle>
                <FormCardDescription>
                  Choose your preferred theme.
                </FormCardDescription>
              </FormCardHeader>
              <FormCardContent className="pb-4">
                <ThemeToggle />
              </FormCardContent>
            </FormCard>
          </>
        )}
      </Section>
    </SectionGroup>
  );
}

type TwoFactorStep = "idle" | "qr" | "verify" | "recovery" | "disable";

function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<TwoFactorStep>("idle");
  const [uri, setUri] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const setupMutation = useMutation(
    trpc.auth.setupTotp.mutationOptions({
      onSuccess: (data) => {
        setUri(data.uri);
        setStep("qr");
        setError(null);
      },
      onError: (err) => setError(err.message),
    }),
  );

  const verifyMutation = useMutation(
    trpc.auth.verifyTotp.mutationOptions({
      onSuccess: (data) => {
        setRecoveryCodes(data.recoveryCodes);
        setStep("recovery");
        setError(null);
      },
      onError: (err) => setError(err.message),
    }),
  );

  const disableMutation = useMutation(
    trpc.auth.disableTotp.mutationOptions({
      onSuccess: () => {
        setStep("idle");
        setDisablePassword("");
        setError(null);
        queryClient.invalidateQueries({
          queryKey: trpc.user.get.queryKey(),
        });
      },
      onError: (err) => setError(err.message),
    }),
  );

  function handleCopyCodes() {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDoneRecovery() {
    setStep("idle");
    setRecoveryCodes([]);
    setVerifyCode("");
    setUri("");
    queryClient.invalidateQueries({
      queryKey: trpc.user.get.queryKey(),
    });
  }

  return (
    <FormCard>
      <FormCardHeader>
        <div className="flex items-center gap-2">
          <FormCardTitle>Two-Factor Authentication</FormCardTitle>
          {enabled && <Badge variant="secondary">Enabled</Badge>}
        </div>
        <FormCardDescription>
          {enabled
            ? "Your account is protected with two-factor authentication."
            : "Add an extra layer of security to your account."}
        </FormCardDescription>
      </FormCardHeader>
      <FormCardContent>
        {step === "idle" && !enabled && (
          <Button
            size="sm"
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
          >
            {setupMutation.isPending ? "Setting up..." : "Enable 2FA"}
          </Button>
        )}

        {step === "idle" && enabled && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setStep("disable");
              setError(null);
            }}
          >
            Disable 2FA
          </Button>
        )}

        {step === "qr" && (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google
              Authenticator, Authy, 1Password, etc.).
            </p>
            <div className="flex justify-center rounded-lg border bg-white p-4">
              <QRCodeSVG value={uri} size={200} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="totp-verify">
                Enter the 6-digit code from your app
              </Label>
              <Input
                id="totp-verify"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="000000"
                className="text-center tracking-widest"
                autoComplete="one-time-code"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => verifyMutation.mutate({ code: verifyCode })}
                disabled={
                  verifyCode.length !== 6 || verifyMutation.isPending
                }
              >
                {verifyMutation.isPending ? "Verifying..." : "Verify & Enable"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("idle");
                  setUri("");
                  setVerifyCode("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "recovery" && (
          <div className="grid gap-4">
            <p className="text-sm font-medium text-green-600">
              Two-factor authentication has been enabled.
            </p>
            <p className="text-sm text-muted-foreground">
              Save these recovery codes in a safe place. Each code can only be
              used once. If you lose access to your authenticator app, you can
              use these codes to sign in.
            </p>
            <div className="rounded-lg border bg-muted/50 p-4 font-mono text-sm">
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCodes}
              >
                {copied ? "Copied" : "Copy codes"}
              </Button>
              <Button size="sm" onClick={handleDoneRecovery}>
                I've saved these codes
              </Button>
            </div>
          </div>
        )}

        {step === "disable" && (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Enter your password to disable two-factor authentication. This
              will sign out all other sessions.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="disable-password">Password</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  disableMutation.mutate({ password: disablePassword })
                }
                disabled={!disablePassword || disableMutation.isPending}
              >
                {disableMutation.isPending
                  ? "Disabling..."
                  : "Confirm Disable"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("idle");
                  setDisablePassword("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && step === "idle" && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
      </FormCardContent>
    </FormCard>
  );
}

function PasskeyCard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: passkeys } = useQuery(trpc.auth.listPasskeys.queryOptions());
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [removePassword, setRemovePassword] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const renameMutation = useMutation(
    trpc.auth.renamePasskey.mutationOptions({
      onSuccess: () => {
        setRenamingId(null);
        setRenameValue("");
        queryClient.invalidateQueries({
          queryKey: trpc.auth.listPasskeys.queryKey(),
        });
      },
      onError: (err) => setError(err.message),
    }),
  );

  const removeMutation = useMutation(
    trpc.auth.removePasskey.mutationOptions({
      onSuccess: () => {
        setRemoveId(null);
        setRemovePassword("");
        setError(null);
        queryClient.invalidateQueries({
          queryKey: trpc.auth.listPasskeys.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.auth.hasPasskeys.queryKey(),
        });
      },
      onError: (err) => setError(err.message),
    }),
  );

  async function handleRegister() {
    setRegistering(true);
    setError(null);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const options = await getPasskeyRegistrationOptions();
      const credential = await startRegistration({ optionsJSON: options });
      const name = prompt("Name this passkey (e.g., 'YubiKey 5')") || "Passkey";
      await verifyPasskeyRegistration(credential, name);
      queryClient.invalidateQueries({
        queryKey: trpc.auth.listPasskeys.queryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: trpc.auth.hasPasskeys.queryKey(),
      });
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        setRegistering(false);
        return;
      }
      setError(e.message || "Registration failed.");
    }
    setRegistering(false);
  }

  return (
    <FormCard>
      <FormCardHeader>
        <div className="flex items-center gap-2">
          <FormCardTitle>Passkeys</FormCardTitle>
          {passkeys && passkeys.length > 0 && (
            <Badge variant="secondary">
              {passkeys.length} registered
            </Badge>
          )}
        </div>
        <FormCardDescription>
          Sign in with a security key or biometric authenticator. Passkeys bypass
          password and two-factor authentication.
        </FormCardDescription>
      </FormCardHeader>
      <FormCardContent>
        {passkeys && passkeys.length > 0 && (
          <div className="grid gap-2 mb-4">
            {passkeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="grid gap-0.5">
                  {renamingId === pk.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-7 w-48"
                        maxLength={50}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && renameValue.trim()) {
                            renameMutation.mutate({
                              id: pk.id,
                              name: renameValue.trim(),
                            });
                          }
                          if (e.key === "Escape") {
                            setRenamingId(null);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          renameValue.trim() &&
                          renameMutation.mutate({
                            id: pk.id,
                            name: renameValue.trim(),
                          })
                        }
                        disabled={renameMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRenamingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium">{pk.name}</span>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {pk.deviceType === "multiDevice"
                        ? "Multi-device"
                        : "Single-device"}
                    </span>
                    {pk.backedUp ? <Badge variant="outline">Synced</Badge> : null}
                    <span>
                      Added{" "}
                      {pk.createdAt
                        ? new Date(pk.createdAt).toLocaleDateString()
                        : "unknown"}
                    </span>
                  </div>
                </div>
                {renamingId !== pk.id && removeId !== pk.id && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRenamingId(pk.id);
                        setRenameValue(pk.name);
                        setError(null);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRemoveId(pk.id);
                        setRemovePassword("");
                        setError(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {removeId === pk.id && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="password"
                      placeholder="Password"
                      value={removePassword}
                      onChange={(e) => setRemovePassword(e.target.value)}
                      className="h-7 w-40"
                      autoComplete="current-password"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        removeMutation.mutate({
                          id: pk.id,
                          password: removePassword,
                        })
                      }
                      disabled={!removePassword || removeMutation.isPending}
                    >
                      {removeMutation.isPending ? "..." : "Confirm"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRemoveId(null);
                        setError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive mb-2">{error}</p>}

        <Button
          size="sm"
          onClick={handleRegister}
          disabled={registering}
        >
          {registering ? "Registering..." : "Add passkey"}
        </Button>
      </FormCardContent>
    </FormCard>
  );
}

function PasswordChangeCard() {
  const trpc = useTRPC();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePasswordMutation = useMutation(
    trpc.auth.changePassword.mutationOptions({
      onSuccess: () => {
        setSuccess(true);
        setError(null);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      },
      onError: (err) => {
        setError(err.message || "Failed to change password.");
        setSuccess(false);
      },
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  }

  return (
    <FormCard>
      <FormCardHeader>
        <FormCardTitle>Change Password</FormCardTitle>
        <FormCardDescription>
          Update your password. This will sign out all other sessions.
        </FormCardDescription>
      </FormCardHeader>
      <FormCardContent>
        <form onSubmit={handleSubmit} className="grid gap-4" id="password-form">
          <div className="grid gap-1.5">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={12}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600">
              Password changed successfully. Other sessions have been signed
              out.
            </p>
          )}
        </form>
      </FormCardContent>
      <FormCardFooter>
        <Button
          type="submit"
          form="password-form"
          size="sm"
          disabled={changePasswordMutation.isPending}
        >
          {changePasswordMutation.isPending
            ? "Changing..."
            : "Change Password"}
        </Button>
      </FormCardFooter>
    </FormCard>
  );
}
