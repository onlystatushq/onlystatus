"use client";

import { NavBreadcrumb } from "@/components/nav/nav-breadcrumb";
import { Cog, User } from "lucide-react";

export function Breadcrumb() {
  return (
    <NavBreadcrumb
      items={[
        { type: "page", label: "Settings" },
        {
          type: "select",
          items: [
            { value: "general", label: "General", icon: Cog },
            { value: "account", label: "Account", icon: User },
          ],
        },
      ]}
    />
  );
}
