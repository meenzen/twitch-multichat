import { describe, expect, it } from "bun:test";
import { isBttvEmote, isTwitchEmote, precacheEntries } from "./precache";

const files = (...paths: string[]) => paths.map((path) => ({ path }));

describe("precacheEntries", () => {
  it("precaches hashed build output without a revision", () => {
    const entries = precacheEntries(
      files(
        "/_app/immutable/entry/app.abc123.js",
        "/_app/immutable/assets/0.def456.css",
      ),
      [],
      "v1",
    );

    expect(entries).toEqual([
      { url: "/_app/immutable/entry/app.abc123.js", revision: null },
      { url: "/_app/immutable/assets/0.def456.css", revision: null },
    ]);
  });

  it("revisions static assets with the app version", () => {
    const entries = precacheEntries(
      [],
      files("/emote.png", "/favicon.ico"),
      "v1",
    );

    expect(entries).toEqual([
      { url: "/emote.png", revision: "v1" },
      { url: "/favicon.ico", revision: "v1" },
    ]);
  });

  it("changes the revision of static assets on a new deploy", () => {
    const assets = files("/emote.png");
    const immutable = files("/_app/immutable/entry/app.abc123.js");

    const before = precacheEntries(immutable, assets, "v1");
    const after = precacheEntries(immutable, assets, "v2");

    // static file must be re-fetched, unchanged hashed file can stay cached
    expect(after.find((e) => e.url === "/emote.png")?.revision).toBe("v2");
    expect(before.find((e) => e.url === "/emote.png")?.revision).toBe("v1");
    expect(after.filter((e) => e.revision === null)).toEqual(
      before.filter((e) => e.revision === null),
    );
  });

  it("skips files that should not be precached", () => {
    const entries = precacheEntries(
      files("/_app/immutable/chunks/data.json", "/_app/immutable/x.js.map"),
      files(
        "/robots.txt",
        "/_headers",
        "/font.woff2",
        "/font.woff",
        "/logo.webp",
        "/icon.svg",
      ),
      "v1",
    );

    expect(entries.map((e) => e.url)).toEqual([
      "/font.woff2",
      "/font.woff",
      "/logo.webp",
      "/icon.svg",
    ]);
  });
});

describe("isTwitchEmote", () => {
  it("matches the Twitch emote CDN", () => {
    expect(
      isTwitchEmote(
        new URL(
          "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0",
        ),
      ),
    ).toBe(true);
  });

  it("does not match other origins", () => {
    expect(isTwitchEmote(new URL("https://example.com/emote.png"))).toBe(false);
    expect(isTwitchEmote(new URL("http://static-cdn.jtvnw.net/x"))).toBe(false);
    expect(
      isTwitchEmote(new URL("https://static-cdn.jtvnw.net.evil.com/x")),
    ).toBe(false);
  });
});

describe("isBttvEmote", () => {
  it("matches only the BetterTTV CDN", () => {
    expect(
      isBttvEmote(new URL("https://cdn.betterttv.net/emote/k1/1x.webp")),
    ).toBe(true);
    expect(isBttvEmote(new URL("https://api.betterttv.net/3/x"))).toBe(false);
    expect(isBttvEmote(new URL("https://cdn.betterttv.net.evil.com/x"))).toBe(
      false,
    );
  });
});
