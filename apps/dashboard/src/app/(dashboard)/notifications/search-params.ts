import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const searchParamsParsers = {
  channel: parseAsString,
};

export const searchParamsCache = createSearchParamsCache(searchParamsParsers);
