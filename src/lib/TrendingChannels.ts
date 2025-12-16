const API_URL = "https://mnzn.dev/api/twitch/streams/trending?language=English";

let cachedChannels: string[] | null = null;
let fetchPromise: Promise<string[] | null> | null = null;

export async function fetchTrendingChannels(): Promise<string[] | null> {
  // If we already have cached channels, return them
  if (cachedChannels !== null) {
    return cachedChannels;
  }

  // If there's already a fetch in progress, return that promise
  if (fetchPromise !== null) {
    return fetchPromise;
  }

  // Start a new fetch
  fetchPromise = (async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch trending channels: ${response.status}`);
      }
      const channels: string[] = await response.json();
      cachedChannels = channels;
      return channels;
    } catch (error) {
      console.error("Error fetching trending channels:", error);
      // Return null on error to allow fallback channels to be used
      return null;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function getCachedChannels(): string[] | null {
  return cachedChannels;
}

export function clearCache(): void {
  cachedChannels = null;
  fetchPromise = null;
}
