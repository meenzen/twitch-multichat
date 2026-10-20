import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { assets, immutable } from "$app/manifest";
import { version } from "$app/env";
import { isBttvEmote, isTwitchEmote, precacheEntries } from "./precache";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(precacheEntries(immutable, assets, version));

// clean old assets
cleanupOutdatedCaches();

// cache emote images, an emote id always shows the same image
function cacheEmotes(match: (url: URL) => boolean, cacheName: string) {
  registerRoute(
    ({ url }) => match(url),
    new CacheFirst({
      cacheName,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50000,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 1 month
          purgeOnQuotaError: true,
        }),
      ],
    }),
  );
}

cacheEmotes(isTwitchEmote, "twitch-emotes");
cacheEmotes(isBttvEmote, "bttv-emotes");

/*
let allowlist: undefined | RegExp[];
let denylist: RegExp[] = [new RegExp("^/api"), new RegExp("/[^/]+\\.[^/]+$")];

// to allow work offline
registerRoute(new NavigationRoute(
    createHandlerBoundToURL('/'),
    { allowlist, denylist }
))
*/

// activate new versions immediately instead of waiting for all tabs to close
self.skipWaiting();
clientsClaim();
