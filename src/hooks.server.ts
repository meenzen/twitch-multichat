import type { Handle } from "@sveltejs/kit/hooks";
import { cacheControl } from "#lib/cacheControl.ts";

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  const cache = cacheControl(
    event.request.method,
    event.route.id,
    response.status,
  );
  if (cache) response.headers.set("Cache-Control", cache);
  return response;
};
