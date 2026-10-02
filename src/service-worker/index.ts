import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { assets, immutable } from "$app/manifest";
import { version } from "$app/env";

declare let self: ServiceWorkerGlobalScope;

const precacheable = /\.(js|css|ico|png|svg|webp|woff2?)$/;

precacheAndRoute([
  // hashed build output, the filename changes with its content
  ...immutable
    .filter(({ path }) => precacheable.test(path))
    .map(({ path }) => ({ url: path, revision: null })),
  // files from static/ keep their name, so revision them by app version
  ...assets
    .filter(({ path }) => precacheable.test(path))
    .map(({ path }) => ({ url: path, revision: version })),
]);

// clean old assets
cleanupOutdatedCaches();

// cache twitch emotes
registerRoute(
  ({ url }) => url.origin === "https://static-cdn.jtvnw.net",
  new CacheFirst({
    cacheName: "twitch-emotes",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50000,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 1 month
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

/*
let allowlist: undefined | RegExp[];
let denylist: RegExp[] = [new RegExp("^/api"), new RegExp("/[^/]+\\.[^/]+$")];

// to allow work offline
registerRoute(new NavigationRoute(
    createHandlerBoundToURL('/'),
    { allowlist, denylist }
))
*/

self.skipWaiting();
clientsClaim();
