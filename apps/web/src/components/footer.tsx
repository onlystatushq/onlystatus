export function Footer() {
  return (
    <footer className="border-t border-border">
      {/* Disclaimer */}
      <div className="border-b border-border px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-card/50 p-5">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              A note
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This is a community fork, not a commercially supported product. It
              is maintained in spare time and may contain bugs. Provided as-is,
              without warranty of any kind. Use at your own risk. If you need rock-solid
              monitoring with dedicated support, go with the{" "}
              <a
                href="https://www.openstatus.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 transition-colors hover:text-success"
              >
                OpenStatus
              </a>{" "}
              team directly. They are excellent and their paid plans will take
              care of you. If you are the &ldquo;I&rsquo;ll run it
              myself&rdquo; type, this is the repo for you.
            </p>
          </div>
        </div>
      </div>

      {/* Attribution */}
      <div className="px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            <a
              href="https://github.com/neoyubi/onlystatus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 transition-colors hover:text-success"
            >
              OnlyStatus
            </a>{" "}
            is a fork of{" "}
            <a
              href="https://github.com/openstatusHQ/openstatus"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 transition-colors hover:text-foreground"
            >
              OpenStatus
            </a>{" "}
            , extended for self-hosted deployment.
          </p>
          <p className="font-mono text-xs text-muted-foreground">AGPL-3.0</p>
        </div>
      </div>
    </footer>
  );
}
