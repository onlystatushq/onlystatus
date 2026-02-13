import type { EventProps } from "./events";

export type IdentifyProps = {
  userId?: string;
  fullName?: string | null;
  email?: string;
  workspaceId?: string;
  plan?: "free" | "starter" | "team";
  location?: string;
  userAgent?: string;
};

export async function setupAnalytics(_props: IdentifyProps) {
  return {
    track: (_opts: EventProps & Record<string, unknown>): Promise<unknown> => {
      return Promise.resolve(null);
    },
  };
}
