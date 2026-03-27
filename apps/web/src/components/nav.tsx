"use client";

import { BookOpen, ExternalLink, GitFork, Github } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function Nav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/icon.png"
            alt=""
            width={20}
            height={20}
            className="invert"
          />
          <span className="font-cal text-lg">OnlyStatus</span>
        </Link>
        <div className="flex items-center gap-4">
          <div ref={ref} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-3 w-72 rounded-xl border border-border bg-card p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                <Link
                  href="/docs"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-success/20 bg-success/10">
                    <GitFork className="size-3.5 text-success" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      Deployment Guide
                    </span>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      Setup and production deployment for OnlyStatus
                    </p>
                  </div>
                </Link>
                <div className="mx-3 my-0.5 border-t border-border/50" />
                <a
                  href="https://docs.openstatus.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
                    <BookOpen className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      OpenStatus Docs
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </span>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      Official documentation from the origin repository
                    </p>
                  </div>
                </a>
              </div>
            )}
          </div>
          <a
            href="https://github.com/neoyubi/onlystatus"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="size-4" />
          </a>
        </div>
      </div>
    </nav>
  );
}
