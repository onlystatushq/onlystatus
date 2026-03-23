"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const commands = `git clone https://github.com/neoyubi/onlystatus.git
cd onlystatus
docker compose up -d`;

export function CommandBlock() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(commands);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-card shadow-[0_0_40px_oklch(0.72_0.19_150/0.04)]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-muted-foreground">
          onlystatus
        </span>
      </div>
      <div className="relative p-4">
        <pre className="font-[family-name:var(--font-commit-mono)] text-sm leading-relaxed">
          <code>
            {commands.split("\n").map((line, i) => (
              <div key={i}>
                <span className="text-success">$</span>{" "}
                <span className="text-foreground">{line}</span>
              </div>
            ))}
            <span
              className="inline-block h-4 w-2 translate-y-0.5 bg-foreground"
              style={{ animation: "blink 1.2s step-end infinite" }}
            />
          </code>
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-3 right-3 rounded-md border border-border bg-background/50 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}
