// Cache-Control for responses rendered by the Cloudflare Pages Function.
//
// Pages runs Functions before its CDN cache, so Cloudflare itself never
// answers from cache. Browser and scraper (Discord, Twitter, ...) caches do:
// their hits never reach Cloudflare, which saves repeat requests from the
// same client. Prerendered pages and static files are served by Pages
// directly.

const day = 24 * 60 * 60;

const policies: Record<string, string> = {
  // Always revalidated: the HTML references the current build's hashed
  // scripts, which are gone after a deploy. A cached copy could start a
  // previous build, or a blank page once its scripts are evicted. Chat pages
  // stay open for hours, so caching them would barely save requests anyway.
  "/-/[...channels]": "no-cache",
  "/dev/chat": "no-cache",
  // Expensive to render, only depends on the URL and scrapers fetch it
  // repeatedly. A day rather than the renderer's default of a year, so
  // design changes reach scrapers.
  "/images/preview.png": `public, max-age=${day}, stale-while-revalidate=${7 * day}`,
};

/**
 * The Cache-Control header for a response, or null to leave it alone.
 * Only successful GET/HEAD responses of known routes are cached; errors and
 * everything else stay uncached so a bad response can't stick.
 */
export function cacheControl(
  method: string,
  routeId: string | null,
  status: number,
): string | null {
  if (method !== "GET" && method !== "HEAD") return null;
  if (routeId === null) return null;
  const policy = policies[routeId];
  if (!policy) return null;
  return status === 200 ? policy : "no-store";
}
