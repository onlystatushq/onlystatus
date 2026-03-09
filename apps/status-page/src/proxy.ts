import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

import { db, sql } from "@openstatus/db";
import { page, selectPageSchema } from "@openstatus/db/src/schema";
import { getValidSubdomain } from "./lib/domain";
import { createProtectedCookieKey } from "./lib/protected";

const STATUS_PAGE_DOMAIN =
  process.env.STATUS_PAGE_DOMAIN ?? "localhost";

export default auth(async (req) => {
  const url = req.nextUrl.clone();
  const response = NextResponse.next();
  const cookies = req.cookies;
  const headers = req.headers;
  const host = headers.get("x-forwarded-host");
  const effectiveHost = host ?? url.host;

  let prefix = "";
  let type: "hostname" | "pathname";

  const hostnames = host?.split(/[.:]/) ?? url.host.split(/[.:]/);
  const pathnames = url.pathname.split("/");

  const subdomain = getValidSubdomain(effectiveHost);
  console.log({
    hostnames,
    pathnames,
    host,
    urlHost: url.host,
    subdomain,
  });

  if (subdomain !== null) {
    // Subdomain detected (either a slug or a full custom domain)
    prefix = subdomain.toLowerCase();
    type = "hostname";
  } else if (
    hostnames.length > 2 &&
    hostnames[0] !== "www" &&
    !url.host.endsWith(".vercel.app")
  ) {
    prefix = hostnames[0].toLowerCase();
    type = "hostname";
  } else {
    prefix = pathnames[1]?.toLowerCase() ?? "";
    type = "pathname";
  }

  // When on the base STATUS_PAGE_DOMAIN with no subdomain, use the full host
  // for custom_domain lookup (supports single-tenant self-hosted setups)
  const hostWithoutPort = effectiveHost.replace(/:\d+$/, "");
  if (subdomain === null && hostWithoutPort === STATUS_PAGE_DOMAIN) {
    prefix = hostWithoutPort;
    type = "hostname";
  }

  console.log({ pathname: url.pathname, type, prefix, subdomain });

  if (url.pathname === "/" && type === "pathname" && !prefix) {
    return response;
  }

  const query = await db
    .select()
    .from(page)
    .where(
      sql`lower(${page.slug}) = ${prefix} OR lower(${page.customDomain}) = ${prefix}`,
    )
    .get();

  const validation = selectPageSchema.safeParse(query);

  if (!validation.success) {
    return response;
  }

  const _page = validation.data;

  console.log({ slug: _page?.slug, customDomain: _page?.customDomain });

  if (_page?.accessType === "password") {
    const protectedCookie = cookies.get(createProtectedCookieKey(_page.slug));
    const cookiePassword = protectedCookie ? protectedCookie.value : undefined;
    const queryPassword = url.searchParams.get("pw");
    const password = queryPassword || cookiePassword;

    if (password !== _page.password && !url.pathname.endsWith("/login")) {
      const { pathname, origin } = req.nextUrl;

      // custom domain redirect
      if (_page.customDomain && type === "hostname" && effectiveHost.replace(/:\d+$/, "") === _page.customDomain) {
        const redirect = pathname.replace(`/${_page.customDomain}`, "");
        const url = new URL(
          `https://${_page.customDomain}/login?redirect=${encodeURIComponent(
            redirect,
          )}`,
        );
        console.log("redirect to /login", url.toString());
        return NextResponse.redirect(url);
      }

      const url = new URL(
        `${origin}${
          type === "pathname" ? `/${prefix}` : ""
        }/login?redirect=${encodeURIComponent(pathname)}`,
      );
      return NextResponse.redirect(url);
    }
    if (password === _page.password && url.pathname.endsWith("/login")) {
      const rawRedirect = url.searchParams.get("redirect");
      const redirect =
        rawRedirect?.startsWith("/") && !rawRedirect.startsWith("//")
          ? rawRedirect
          : null;

      // custom domain redirect
      if (_page.customDomain && type === "hostname" && effectiveHost.replace(/:\d+$/, "") === _page.customDomain) {
        const url = new URL(`https://${_page.customDomain}${redirect ?? "/"}`);
        console.log("redirect to /", url.toString());
        return NextResponse.redirect(url);
      }

      return NextResponse.redirect(
        new URL(
          `${req.nextUrl.origin}${
            redirect ?? (type === "pathname" ? `/${prefix}` : "/")
          }`,
        ),
      );
    }
  }

  if (_page.accessType === "email-domain") {
    const { origin, pathname } = req.nextUrl;
    const email = req.auth?.user?.email;
    const emailDomain = email?.split("@")[1];
    if (
      !pathname.endsWith("/login") &&
      (!emailDomain || !_page.authEmailDomains.includes(emailDomain))
    ) {
      const url = new URL(
        `${origin}${type === "pathname" ? `/${prefix}` : ""}/login`,
      );
      return NextResponse.redirect(url);
    }
    if (
      pathname.endsWith("/login") &&
      emailDomain &&
      _page.authEmailDomains.includes(emailDomain)
    ) {
      const url = new URL(
        `${origin}${type === "pathname" ? `/${prefix}` : ""}`,
      );
      return NextResponse.redirect(url);
    }
  }

  // Hostname-based routing (subdomain or custom domain): prepend slug to path
  // Path-based routing: slug is already in the URL, no rewrite needed
  if (type === "hostname") {
    const rewriteUrl = new URL(
      `/${_page.slug}${url.pathname === "/" ? "" : url.pathname}`,
      req.url,
    );
    rewriteUrl.search = url.search;
    return NextResponse.rewrite(rewriteUrl);
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!api|assets|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
