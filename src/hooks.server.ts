// hooks.server.js
import { init } from '@jill64/sentry-sveltekit-cloudflare/server'
// or
// import { serverInit } from '@jill64/sentry-sveltekit-cloudflare'

const { onHandle, onError } = init(
    'https://bf0e1a778faa45f43774793d79698924@o4508253646553088.ingest.de.sentry.io/4508253698064464',
    {
        toucanOptions: {
            tracesSampleRate: 1.0,
        },
        handleOptions: {
            handleUnknownRoutes: false,
        },
        enableInDevMode: false,
    }
)

export const handle = onHandle(async ({ event, resolve }) => {
    const response = await resolve(event);
    response.headers.set("Document-Policy", "js-profiling");
    return response;
})

export const handleError = onError((e, sentryEventId) => {
    // no special error handling
})