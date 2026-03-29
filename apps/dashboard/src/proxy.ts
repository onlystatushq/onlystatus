import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db, eq } from "@openstatus/db";
import { user, usersToWorkspaces, workspace } from "@openstatus/db/src/schema";
import { getCurrency } from "@openstatus/db/src/schema/plan/utils";

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const response = NextResponse.next();

  const continent = req.headers.get("x-vercel-ip-continent") || "NA";
  const country = req.headers.get("x-vercel-ip-country") || "US";
  const currency = getCurrency({ continent, country });

  // NOTE: used in the pricing table to display the currency based on user's location
  response.cookies.set("x-currency", currency);

  if (url.pathname.includes("api/trpc")) {
    return response;
  }

  // Decode JWT directly - edge-compatible, no native deps needed
  // Behind a TLS-terminating proxy (Traefik), the request arrives as HTTP
  // but AUTH_TRUST_HOST makes NextAuth set __Secure- prefixed cookies.
  // Try secure cookie first (HTTPS via proxy), fall back to plain (local dev).
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: req.headers.get("x-forwarded-proto") === "https",
  });

  const isAuthenticated = !!token?.userId;

  if (!isAuthenticated && url.pathname !== "/login") {
    console.log("User not authenticated, redirecting to login");
    const newURL = new URL("/login", req.url);
    const encodedSearchParams = `${url.pathname}${url.search}`;

    if (encodedSearchParams) {
      newURL.searchParams.append("redirectTo", encodedSearchParams);
    }

    return NextResponse.redirect(newURL);
  }

  if (isAuthenticated && url.pathname === "/login") {
    const redirectTo = url.searchParams.get("redirectTo");
    console.log("User authenticated, redirecting to", redirectTo);
    if (redirectTo) {
      const redirectToUrl = new URL(redirectTo, req.url);
      if (redirectToUrl.origin !== new URL(req.url).origin) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.redirect(redirectToUrl);
    }
  }

  const hasWorkspaceSlug = req.cookies.has("workspace-slug");

  if (isAuthenticated && token.userId && !hasWorkspaceSlug) {
    const [query] = await db
      .select()
      .from(usersToWorkspaces)
      .innerJoin(user, eq(user.id, usersToWorkspaces.userId))
      .innerJoin(workspace, eq(workspace.id, usersToWorkspaces.workspaceId))
      .where(eq(user.id, Number.parseInt(token.userId as string)))
      .all();

    if (!query) {
      console.error(">> Should not happen, no workspace found for user");
      return response;
    }

    response.cookies.set("workspace-slug", query.workspace.slug);
  }

  if (!isAuthenticated && hasWorkspaceSlug) {
    response.cookies.delete("workspace-slug");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|assets|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
