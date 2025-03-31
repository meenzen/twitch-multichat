import {
  handleErrorWithSentry,
  sentryHandle,
  initCloudflareSentryHandle,
} from "@sentry/sveltekit";
import { sequence } from "@sveltejs/kit/hooks";
import { dev } from "$app/environment";

export const handle = sequence(
  initCloudflareSentryHandle({
    dsn: "https://bf0e1a778faa45f43774793d79698924@o4508253646553088.ingest.de.sentry.io/4508253698064464",
    tracesSampleRate: 1.0,
    enabled: !dev,
  }),
  sentryHandle(),
  async ({ event, resolve }) => {
    const response = await resolve(event);
    response.headers.set("Document-Policy", "js-profiling");
    return response;
  },
);
export const handleError = handleErrorWithSentry();
