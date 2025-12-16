const API_URL = "https://mnzn.dev/api/twitch/streams/trending?language=English";

let channels: string[] | null = null;
let promise: Promise<string[]> | null = null;

export async function fetchTrendingChannels(): Promise<string[]> {
  if (channels !== null) {
    return channels;
  }

  if (promise !== null) {
    return promise;
  }

  promise = (async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch trending channels: ${response.status}`,
        );
      }
      const result: string[] = await response.json();
      channels = result;
      return result;
    } catch (error) {
      console.error("Error fetching trending channels:", error);
      return [];
    } finally {
      promise = null;
    }
  })();

  return promise;
}
