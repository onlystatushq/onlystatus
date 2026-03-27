"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function Terminal({
  title,
  commands,
  glow = false,
  shell = true,
}: {
  title?: string;
  commands: string[];
  glow?: boolean;
  shell?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const text = commands
    .filter((line) => !line.startsWith("#"))
    .join("\n");

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={`relative w-full min-w-0 rounded-lg border border-border bg-card ${
        glow
          ? "shadow-[0_0_40px_oklch(0.72_0.19_150/0.04)]"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        {title && (
          <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
            {title}
          </span>
        )}
      </div>
      <div className="relative px-4 py-3 overflow-x-auto">
        <pre className="font-[family-name:var(--font-commit-mono)] text-[11px] leading-relaxed sm:text-[13px]">
          <code>
            {commands.map((line, i) => (
              <div key={i}>
                {line.startsWith("#") ? (
                  <span className="text-muted-foreground">{line}</span>
                ) : shell ? (
                  <>
                    <span className="text-success">$</span>{" "}
                    <span className="text-foreground">{line}</span>
                  </>
                ) : (
                  <span className="text-foreground">{line}</span>
                )}
              </div>
            ))}
          </code>
        </pre>
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-2 right-2 rounded-md border border-border bg-background/50 p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
