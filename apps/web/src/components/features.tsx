import {
  Activity,
  Mail,
  MapPin,
  Monitor,
  Shield,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Activity,
    label: "HTTP, TCP, DNS",
    desc: "Three check types from local or distributed checkers",
  },
  {
    icon: Monitor,
    label: "Status Pages",
    desc: "Custom domains, themes, and incident tracking",
  },
  {
    icon: Mail,
    label: "Alerts",
    desc: "Slack, Discord, webhook, email, and more",
  },
  {
    icon: MapPin,
    label: "Private Locations",
    desc: "Deploy checkers anywhere in the world",
  },
  {
    icon: Shield,
    label: "Full Auth",
    desc: "Password, TOTP, and WebAuthn out of the box",
  },
  {
    icon: Zap,
    label: "No Limits",
    desc: "All features unlocked, no plan tiers",
  },
];

export function Features() {
  return (
    <section className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="font-cal text-3xl tracking-tight sm:text-4xl">
            Everything Included
          </h2>
          <p className="mt-3 text-muted-foreground">
            All features, no paywalls. Self-host and own your monitoring stack.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.label}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-muted-foreground/30"
            >
              <div className="mb-1.5 flex items-center gap-2.5">
                <f.icon className="size-4 text-muted-foreground" />
                <span className="font-mono text-sm font-semibold">
                  {f.label}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
