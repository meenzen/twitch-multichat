import * as Sentry from "@sentry/sveltekit";
import { dev } from "$app/environment";

Sentry.init({
  dsn: "https://bf0e1a778faa45f43774793d79698924@o4508253646553088.ingest.de.sentry.io/4508253698064464",
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
  enabled: !dev,
});

export const handleError = Sentry.handleErrorWithSentry();
