/// <reference lib="WebWorker" />
/// <reference types="vite/client" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from "workbox-core";
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)

// clean old assets
cleanupOutdatedCaches()

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
    })
)

let allowlist: undefined | RegExp[]
let denylist: RegExp[] = [
    new RegExp("^/api"),
    new RegExp("/[^/]+\\.[^/]+$"),
]

// to allow work offline
/*
registerRoute(new NavigationRoute(
    createHandlerBoundToURL('/'),
    { allowlist, denylist }
))
*/

self.skipWaiting()
clientsClaim()