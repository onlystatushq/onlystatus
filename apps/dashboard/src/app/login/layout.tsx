import { redirect } from "next/navigation";

import { AuthLayout } from "@/components/layout/auth-layout";
import { auth } from "@/lib/auth";
import { HydrateClient, prefetch, trpc } from "@/lib/trpc/server";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session) redirect("/");

  prefetch(trpc.auth.hasUsers.queryOptions());
  prefetch(trpc.auth.hasPasskeys.queryOptions());

  return (
    <HydrateClient>
      <AuthLayout>{children}</AuthLayout>
    </HydrateClient>
  );
}
