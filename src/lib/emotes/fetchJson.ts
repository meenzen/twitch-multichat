export type Fetch = (url: string) => Promise<Response>;

export const defaultFetch: Fetch = (url) => globalThis.fetch(url);

/**
 * GET a JSON document. undefined for 404, which the emote APIs answer for
 * channels that never set the service up; other errors throw.
 */
export async function fetchJson<T>(
  fetch: Fetch,
  url: string,
): Promise<T | undefined> {
  const response = await fetch(url);
  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`${url} responded with ${response.status}`);
  }
  return (await response.json()) as T;
}
