import type { RequestHandler } from "@sveltejs/kit";
import { building } from "$app/env";
import { siteUrl, sitemapXml } from "#lib/site.ts";

export const prerender = true;

export const GET: RequestHandler = ({ url }) =>
  new Response(sitemapXml(siteUrl(url, building).origin), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
