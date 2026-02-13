/**
 * Domain status hook - no-op after Vercel domain API removal.
 * Custom domains now require manual reverse proxy configuration.
 */
export function useDomainStatus(_domain?: string) {
  return {
    status: null,
    domainJson: null,
    refresh: () => {},
    isLoading: false,
  };
}
