import { describe, expect, it } from "bun:test";
import { robotsTxt, siteUrl, sitemapXml, structuredData } from "./site";

describe("siteUrl", () => {
  it("keeps the request origin", () => {
    const url = new URL("https://self-hosted.example/-/foo");
    expect(siteUrl(url, false).href).toBe(url.href);
  });

  it("uses the official deployment while prerendering", () => {
    const url = new URL("http://sveltekit-prerender/-/foo");
    expect(siteUrl(url, true).href).toBe("https://multichat.mnzn.dev/-/foo");
  });
});

describe("structuredData", () => {
  it("describes the app with absolute URLs", () => {
    const data = JSON.parse(structuredData("https://example.com"));
    expect(data).toMatchObject({
      "@type": "WebApplication",
      name: "Twitch Multichat",
      url: "https://example.com/",
      image: "https://example.com/logo-512x512.png",
    });
  });

  it("cannot close the surrounding script tag", () => {
    expect(structuredData("https://example.com")).not.toContain("<");
  });
});

describe("robotsTxt", () => {
  it("points to the sitemap on the same origin", () => {
    expect(robotsTxt("https://example.com")).toContain(
      "Sitemap: https://example.com/sitemap.xml",
    );
  });

  it("keeps chat pages crawlable for link previews", () => {
    expect(robotsTxt("https://example.com")).not.toMatch(/Disallow: \/-/);
  });
});

describe("sitemapXml", () => {
  it("lists the landing page", () => {
    expect(sitemapXml("https://example.com")).toContain(
      "<loc>https://example.com/</loc>",
    );
  });
});
