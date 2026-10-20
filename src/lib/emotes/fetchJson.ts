export type Fetch = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<Response>;

export const defaultFetch: Fetch = (url, init) => globalThis.fetch(url, init);

/**
 * Requests longer than this fail like any other error. Without a limit a
 * hanging API would keep its emotes, and those of every other service
 * loaded together with it, from ever arriving.
 */
const defaultTimeoutMs = 10_000;

/**
 * GET a JSON document. undefined for 404, which the emote APIs answer for
 * channels that never set the service up; other errors throw.
 */
export async function fetchJson<T>(
  fetch: Fetch,
  url: string,
  timeoutMs = defaultTimeoutMs,
): Promise<T | undefined> {
  // also covers reading the body, which is streamed
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`${url} responded with ${response.status}`);
  }
  return (await response.json()) as T;
}
