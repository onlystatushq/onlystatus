export const statusPages = [
  {
    id: 1,
    name: "OnlyStatus",
    description: "See our uptime history and status reports.",
    slug: "status",
    favicon: "/icon.png",
    domain: "",
    protected: true,
    showValues: false,
    // NOTE: the worst status of a report
    status: "degraded" as const,
    monitors: [],
  },
];

export type StatusPage = (typeof statusPages)[number];
