// hooks.server.js
import { init } from '@jill64/sentry-sveltekit-cloudflare/server'
// or
// import { serverInit } from '@jill64/sentry-sveltekit-cloudflare'

const { onHandle, onError } = init(
    'https://7e14327dadb7a8dc3cbb451dc31a20ac@sentry.mnzn.dev/4',
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

export const handle = onHandle();

export const handleError = onError((e, sentryEventId) => {
    // no special error handling
})