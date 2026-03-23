export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Built on{" "}
          <a
            href="https://github.com/openstatusHQ/openstatus"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            OpenStatus
          </a>
        </p>
        <p className="text-sm text-muted-foreground">
          Made by{" "}
          <a
            href="https://github.com/neoyubi"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            neoyubi
          </a>
        </p>
        <p className="font-mono text-xs text-muted-foreground">AGPL-3.0 License</p>
      </div>
    </footer>
  );
}
