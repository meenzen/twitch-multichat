import { beforeAll, describe, expect, it, mock } from "bun:test";

// The service worker entry runs its setup at import time against workbox and
// SvelteKit virtual modules. Replace both, then import it once and inspect
// what it wired up.

const workbox = {
  precacheAndRoute: mock(),
  cleanupOutdatedCaches: mock(),
  registerRoute: mock(),
  clientsClaim: mock(),
  CacheFirst: class {
    constructor(readonly options: object) {}
  },
  ExpirationPlugin: class {
    constructor(readonly options: object) {}
  },
};

mock.module("workbox-precaching", () => ({
  precacheAndRoute: workbox.precacheAndRoute,
  cleanupOutdatedCaches: workbox.cleanupOutdatedCaches,
}));
mock.module("workbox-routing", () => ({
  registerRoute: workbox.registerRoute,
}));
mock.module("workbox-core", () => ({ clientsClaim: workbox.clientsClaim }));
mock.module("workbox-strategies", () => ({ CacheFirst: workbox.CacheFirst }));
mock.module("workbox-expiration", () => ({
  ExpirationPlugin: workbox.ExpirationPlugin,
}));
mock.module("$app/manifest", () => ({
  immutable: [{ path: "/_app/immutable/entry/app.abc123.js" }],
  assets: [{ path: "/emote.png" }, { path: "/robots.txt" }],
}));
mock.module("$app/env", () => ({ version: "1700000000000" }));

const skipWaiting = mock(() => Promise.resolve());

beforeAll(async () => {
  (globalThis as unknown as { skipWaiting: typeof skipWaiting }).skipWaiting =
    skipWaiting;
  await import("./index");
});

type RouteMatcher = (options: { url: URL }) => boolean;

describe("service worker", () => {
  it("activates a new version immediately", () => {
    // without these, an update would wait until every tab is closed
    expect(skipWaiting).toHaveBeenCalledTimes(1);
    expect(workbox.clientsClaim).toHaveBeenCalledTimes(1);
  });

  it("precaches the build, revisioned by app version", () => {
    expect(workbox.precacheAndRoute).toHaveBeenCalledWith([
      { url: "/_app/immutable/entry/app.abc123.js", revision: null },
      { url: "/emote.png", revision: "1700000000000" },
    ]);
  });

  it("removes caches of previous versions", () => {
    expect(workbox.cleanupOutdatedCaches).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      0,
      "twitch-emotes",
      "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0",
    ],
    [1, "bttv-emotes", "https://cdn.betterttv.net/emote/k1/1x.webp"],
  ])(
    "caches emotes cache-first with expiration (route %i, %s)",
    (index, cacheName, emoteUrl) => {
      expect(workbox.registerRoute).toHaveBeenCalledTimes(2);
      const [match, strategy] = workbox.registerRoute.mock.calls[index] as [
        RouteMatcher,
        { options: { cacheName: string; plugins: { options: object }[] } },
      ];

      expect(match({ url: new URL(emoteUrl) })).toBe(true);
      expect(match({ url: new URL("https://example.com/emote.png") })).toBe(
        false,
      );

      expect(strategy).toBeInstanceOf(workbox.CacheFirst);
      expect(strategy.options.cacheName).toBe(cacheName);
      expect(strategy.options.plugins[0].options).toMatchObject({
        maxEntries: 50000,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      });
    },
  );
});
