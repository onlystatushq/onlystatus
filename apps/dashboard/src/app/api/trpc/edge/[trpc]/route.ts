import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

import { getToken } from "next-auth/jwt";
// Import directly from source files to avoid the barrel export which
// pulls in root.ts -> lambda.ts -> auth.ts -> totp.ts (node:crypto)
import { createTRPCContext } from "@openstatus/api/src/trpc";
import { edgeRouter } from "@openstatus/api/src/edge";

export const runtime = "edge";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc/edge",
    router: edgeRouter,
    req: req,
    createContext: async () => {
      // Decode JWT directly - edge-compatible, no native deps needed
      const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
        secureCookie: req.headers.get("x-forwarded-proto") === "https",
      });
      const auth = async () => {
        if (!token?.userId) return null;
        return {
          user: {
            id: token.userId as string,
            email: token.email as string,
          },
        };
      };
      return createTRPCContext({ req, auth });
    },
    onError: ({ error }) => {
      console.log("Error in tRPC handler (edge)");
      console.error(error);
    },
  });

export { handler as GET, handler as POST };
