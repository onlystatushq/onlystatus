import {
  Activity,
  BarChart3,
  Clock,
  Database,
  Globe,
  Layout,
  Monitor,
  Server,
  Wifi,
} from "lucide-react";

const tiers = [
  {
    label: "Frontend",
    nodes: [
      {
        name: "Dashboard",
        tech: "Next.js",
        icon: Layout,
        desc: "Admin UI for monitors, alerts, and settings",
      },
      {
        name: "Status Page",
        tech: "Next.js",
        icon: Monitor,
        desc: "Public status pages for your users",
      },
    ],
  },
  {
    label: "Backend",
    nodes: [
      {
        name: "API Server",
        tech: "Hono",
        icon: Server,
        desc: "REST and RPC API layer",
      },
      {
        name: "Workflows",
        tech: "Hono",
        icon: Clock,
        desc: "Cron scheduling and task processing",
      },
      {
        name: "Checker",
        tech: "Go",
        icon: Activity,
        desc: "Executes HTTP, TCP, and DNS checks",
      },
    ],
  },
  {
    label: "Infrastructure",
    nodes: [
      {
        name: "libSQL",
        tech: "Turso",
        icon: Database,
        desc: "Application database",
      },
      {
        name: "Tinybird",
        tech: "Analytics",
        icon: BarChart3,
        desc: "Time-series metrics and response data",
      },
      {
        name: "Private Location",
        tech: "Go",
        icon: Wifi,
        desc: "Receives results from remote checkers",
      },
    ],
  },
];

export function Architecture() {
  return (
    <section className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="font-cal text-3xl tracking-tight sm:text-4xl">
            Architecture
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything runs in Docker. One compose file, fully self-contained.
          </p>
        </div>

        <div className="space-y-2">
          {tiers.map((tier, tierIdx) => (
            <div key={tier.label}>
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {tier.label}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tier.nodes.map((node) => (
                  <div
                    key={node.name}
                    className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/30"
                  >
                    <div className="mb-2 flex items-center gap-2.5">
                      <node.icon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">
                        {node.name}
                      </span>
                      <span className="ml-auto rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {node.tech}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {node.desc}
                    </p>
                  </div>
                ))}
              </div>
              {tierIdx < tiers.length - 1 && (
                <div className="flex justify-center pb-4">
                  <div className="h-6 w-px border-l border-dashed border-muted-foreground/30" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-muted-foreground/30 bg-card/50 p-4">
          <div className="flex items-center gap-2.5">
            <Globe className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              Remote Checkers
            </span>
            <span className="ml-auto rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              Go
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Lightweight agents you deploy anywhere for distributed monitoring.
            Only needs outbound access to your OnlyStatus instance.
          </p>
        </div>
      </div>
    </section>
  );
}
