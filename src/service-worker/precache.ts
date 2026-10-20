type ManifestFile = { path: string };

export type PrecacheEntry = { url: string; revision: string | null };

const precacheable = /\.(js|css|ico|png|svg|webp|woff2?)$/;

/**
 * Build the workbox precache list. Workbox re-downloads an entry when its
 * url or revision changes, which is what makes a deploy reach the clients.
 */
export function precacheEntries(
  immutable: ManifestFile[],
  assets: ManifestFile[],
  version: string,
): PrecacheEntry[] {
  return [
    // hashed build output, the filename changes with its content
    ...immutable
      .filter(({ path }) => precacheable.test(path))
      .map(({ path }) => ({ url: path, revision: null })),
    // files from static/ keep their name, so revision them by app version
    ...assets
      .filter(({ path }) => precacheable.test(path))
      .map(({ path }) => ({ url: path, revision: version })),
  ];
}

export function isTwitchEmote(url: URL): boolean {
  return url.origin === "https://static-cdn.jtvnw.net";
}

export function isBttvEmote(url: URL): boolean {
  return url.origin === "https://cdn.betterttv.net";
}
