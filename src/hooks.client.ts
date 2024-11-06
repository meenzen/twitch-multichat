import { init } from '@jill64/sentry-sveltekit-cloudflare/client'
import * as Sentry from "@sentry/browser";

const onError = init(
    'https://bf0e1a778faa45f43774793d79698924@o4508253646553088.ingest.de.sentry.io/4508253698064464',
    {
        sentryOptions: {
            tunnel: "/api/tunnel",
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.browserProfilingIntegration(),
                Sentry.replayIntegration(),
            ],
            tracesSampleRate: 1.0,
            profilesSampleRate: 1.0,
            // we only care about errors
            replaysSessionSampleRate: 0,
            replaysOnErrorSampleRate: 1.0,
        },
        enableInDevMode: false,
    }
)

export const handleError = onError((e, sentryEventId) => {
    // no special error handling
})