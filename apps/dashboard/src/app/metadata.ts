import type { Metadata } from "next";

export const TITLE = "onlystatus";
export const DESCRIPTION =
  "Self-hosted synthetic monitoring platform to monitor your services and keep your users informed.";

const OG_TITLE = "onlystatus";
const OG_DESCRIPTION = "Monitor your services and keep your users informed.";
const FOOTER = "onlystatus.dev";
const IMAGE = "assets/og/dashboard-v2.png";

export const defaultMetadata: Metadata = {
  title: {
    template: `%s | ${TITLE}`,
    default: TITLE,
  },
  description: DESCRIPTION,
  metadataBase: new URL("https://onlystatus.dev"),
};

export const twitterMetadata: Metadata["twitter"] = {
  title: TITLE,
  description: DESCRIPTION,
  card: "summary_large_image",
  images: [
    `/api/og?title=${OG_TITLE}&description=${OG_DESCRIPTION}&footer=${FOOTER}&image=${IMAGE}`,
  ],
};

export const ogMetadata: Metadata["openGraph"] = {
  title: TITLE,
  description: DESCRIPTION,
  type: "website",
  images: [
    `/api/og?title=${OG_TITLE}&description=${OG_DESCRIPTION}&footer=${FOOTER}&image=${IMAGE}`,
  ],
};
