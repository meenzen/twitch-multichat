import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render } from "@testing-library/svelte";
import MetaTags from "./MetaTags.svelte";

afterEach(cleanup);

function meta(props: { url: string; channels?: string[]; noindex?: boolean }) {
  const { container } = render(MetaTags, { ...props, url: new URL(props.url) });
  const content = (selector: string) =>
    container.querySelector(selector)?.getAttribute("content") ?? null;
  return {
    container,
    property: (name: string) => content(`meta[property="${name}"]`),
    name: (name: string) => content(`meta[name="${name}"]`),
    canonical: () =>
      container.querySelector('link[rel="canonical"]')?.getAttribute("href"),
  };
}

describe("MetaTags", () => {
  it("describes the landing page with an absolute preview image", () => {
    const tags = meta({ url: "https://example.com/" });

    expect(tags.container.querySelector("title")?.textContent).toBe(
      "Twitch Multichat",
    );
    expect(tags.property("og:image")).toBe(
      "https://example.com/images/preview.png",
    );
    expect(tags.name("twitter:image")).toBe(
      "https://example.com/images/preview.png",
    );
    expect(tags.property("og:url")).toBe("https://example.com/");
    expect(tags.name("robots")).toBeNull();
  });

  it("names the channels and links their preview image", () => {
    const tags = meta({
      url: "https://example.com/-/foo/bar",
      channels: ["foo", "bar"],
    });

    expect(tags.property("og:title")).toBe("Twitch Multichat: foo, bar");
    expect(tags.name("description")).toStartWith(
      "Chat of foo, bar combined into one view.",
    );
    expect(tags.property("og:image")).toBe(
      "https://example.com/images/preview.png?channel=foo&channel=bar",
    );
  });

  it("leaves the settings out of the canonical URL", () => {
    const tags = meta({ url: "https://example.com/-/foo?size=large" });
    expect(tags.canonical()).toBe("https://example.com/-/foo");
    expect(tags.property("og:url")).toBe("https://example.com/-/foo");
  });

  it("can keep a page out of search results", () => {
    const tags = meta({ url: "https://example.com/-/foo", noindex: true });
    expect(tags.name("robots")).toBe("noindex");
  });
});
