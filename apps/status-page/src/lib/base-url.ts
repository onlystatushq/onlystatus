import { getStatusPageUrl } from "@openstatus/utils";

export function getBaseUrl({
  slug,
  customDomain,
}: {
  slug?: string;
  customDomain?: string;
}) {
  return getStatusPageUrl(slug ?? "", customDomain);
}
