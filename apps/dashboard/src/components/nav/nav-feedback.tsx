"use client";

import { useTRPC } from "@/lib/trpc/client";
import { Button } from "@openstatus/ui/components/ui/button";
import { useIsMobile } from "@openstatus/ui/hooks/use-mobile";
import { getEnv } from "@openstatus/utils";
import { useQuery } from "@tanstack/react-query";
import { Bug, Github } from "lucide-react";

export function NavFeedback() {
  const isMobile = useIsMobile();
  const trpc = useTRPC();
  const { data: workspace } = useQuery(trpc.workspace.get.queryOptions());

  const GITHUB_URL =
    getEnv("NEXT_PUBLIC_GITHUB_URL") ??
    "https://github.com/openstatusHQ/openstatus";

  if (isMobile || getEnv("NEXT_PUBLIC_SHOW_GITHUB_NAV") === "false") {
    return null;
  }

  if (workspace && !workspace.settings.showGithubNav) {
    return null;
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 px-2 text-muted-foreground text-sm hover:bg-transparent hover:text-foreground"
        asChild
      >
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          <Github className="size-3.5" />
          GitHub
        </a>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 px-2 text-muted-foreground text-sm hover:bg-transparent hover:text-foreground"
        asChild
      >
        <a
          href={`${GITHUB_URL}/issues`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Bug className="size-3.5" />
          Issues
        </a>
      </Button>
    </div>
  );
}
