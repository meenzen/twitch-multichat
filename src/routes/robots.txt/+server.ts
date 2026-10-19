import type { RequestHandler } from "@sveltejs/kit";
import { building } from "$app/env";
import { robotsTxt, siteUrl } from "#lib/site.ts";

// A route instead of a static file, so the sitemap URL uses the deploy's own
// origin. Chat pages stay crawlable: link preview bots respect robots.txt and
// the pages opt out of search results with a noindex meta tag instead.
export const prerender = true;

export const GET: RequestHandler = ({ url }) =>
  new Response(robotsTxt(siteUrl(url, building).origin), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
