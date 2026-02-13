"use client";

import { Note } from "@/components/common/note";
import { Info } from "lucide-react";

/**
 * Domain configuration notice.
 * Vercel domain provisioning has been removed. Custom domains
 * require manual reverse proxy configuration.
 */
export default function DomainConfiguration({ domain }: { domain: string }) {
  return (
    <Note color="info">
      <Info />
      Custom domains require manual reverse proxy configuration. Point{" "}
      <span className="font-mono font-semibold">{domain}</span> to your status
      page host via your DNS and reverse proxy.
    </Note>
  );
}
