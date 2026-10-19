// Texts shared by the meta tags, the landing page and the preview images.

export const siteName = "Twitch Multichat";

export const siteDescription =
  "Combine multiple Twitch chats into a single view — seamless chat for collabs, multi-stream events or just your favorite streamers.";

/** The official deployment */
export const siteOrigin = "https://multichat.mnzn.dev";

/** The parts of a URL the meta tags need, `page.url` is a read-only URL */
export type PageUrl = Pick<URL, "href" | "origin" | "pathname" | "search">;

/**
 * `url` as seen from outside, for absolute links in meta tags. Prerendered
 * pages have no request, their origin is a placeholder, so they link to the
 * official deployment. Everything else keeps its own origin, so self-hosted
 * and preview deployments link to themselves. Pass `building` from $app/env.
 */
export function siteUrl(url: PageUrl, building: boolean): PageUrl {
  // url.search throws while prerendering, there is no query string anyway
  return building ? new URL(url.pathname, siteOrigin) : url;
}

/** Structured data for search engines, see https://schema.org/WebApplication */
export function structuredData(origin: string): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    url: new URL("/", origin).href,
    description: siteDescription,
    image: new URL("/logo-512x512.png", origin).href,
    applicationCategory: "EntertainmentApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  // keeps the JSON from closing the surrounding <script>
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

export function robotsTxt(origin: string): string {
  return [
    "User-agent: *",
    "Disallow: /api/",
    "Disallow: /dev/",
    "",
    `Sitemap: ${new URL("/sitemap.xml", origin).href}`,
    "",
  ].join("\n");
}

/** Only the landing page is meant for search results, chat pages are noindex */
export function sitemapXml(origin: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${new URL("/", origin).href}</loc></url>
</urlset>
`;
}
