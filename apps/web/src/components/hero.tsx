import { ChevronDown, Github } from "lucide-react";
import { CommandBlock } from "./command-block";

export function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-24">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
          self-hosted / open source
        </span>

        <div className="flex flex-col items-center gap-3">
          <img
            src="/icon.png"
            alt="OnlyStatus"
            width={48}
            height={48}
            className="invert"
          />
          <h1 className="font-cal text-5xl tracking-tight sm:text-7xl">
            OnlyStatus
          </h1>
        </div>

        <p className="max-w-md text-lg text-muted-foreground sm:text-xl">
          Self-hosted synthetic monitoring. No cloud dependencies. No artificial
          limits.
        </p>

        <div className="w-full max-w-lg">
          <CommandBlock />
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/neoyubi/onlystatus"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 font-medium text-sm text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Github className="size-4" />
            GitHub
          </a>
          <a
            href="https://github.com/neoyubi/onlystatus#getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 font-medium text-sm text-foreground transition-colors hover:bg-accent"
          >
            Get Started
          </a>
        </div>
      </div>
      <div className="absolute bottom-8 animate-bounce text-foreground">
        <ChevronDown className="size-5" />
      </div>
    </section>
  );
}
