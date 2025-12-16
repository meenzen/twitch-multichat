import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchTrendingChannels,
  getCachedChannels,
  clearCache,
} from "./TrendingChannels";

// Mock fetch
global.fetch = vi.fn();

describe("TrendingChannels", () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCache();
    // Clear all mocks
    vi.clearAllMocks();
  });

  it("fetches trending channels from API", async () => {
    const mockChannels = ["channel1", "channel2", "channel3"];
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChannels,
    } as Response);

    const channels = await fetchTrendingChannels();

    expect(channels).toEqual(mockChannels);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://mnzn.dev/api/twitch/streams/trending?language=English",
    );
  });

  it("caches the fetched channels", async () => {
    const mockChannels = ["channel1", "channel2", "channel3"];
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChannels,
    } as Response);

    // First fetch
    await fetchTrendingChannels();

    // Second fetch should use cache
    const channels = await fetchTrendingChannels();

    expect(channels).toEqual(mockChannels);
    // Fetch should only be called once
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns cached channels via getCachedChannels", async () => {
    const mockChannels = ["channel1", "channel2", "channel3"];
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChannels,
    } as Response);

    // Before fetch, cache should be null
    expect(getCachedChannels()).toBeNull();

    // After fetch, cache should have data
    await fetchTrendingChannels();
    expect(getCachedChannels()).toEqual(mockChannels);
  });

  it("returns null on fetch error", async () => {
    // Mock console.error to avoid noise in test output
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

    const channels = await fetchTrendingChannels();

    expect(channels).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("returns null on non-ok response", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const channels = await fetchTrendingChannels();

    expect(channels).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("clears cache when clearCache is called", async () => {
    const mockChannels = ["channel1", "channel2", "channel3"];
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockChannels,
    } as Response);

    await fetchTrendingChannels();
    expect(getCachedChannels()).toEqual(mockChannels);

    clearCache();
    expect(getCachedChannels()).toBeNull();

    // After clearing cache, next fetch should call API again
    await fetchTrendingChannels();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("handles concurrent fetch calls", async () => {
    const mockChannels = ["channel1", "channel2", "channel3"];
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockChannels,
    } as Response);

    // Start multiple fetches concurrently
    const promise1 = fetchTrendingChannels();
    const promise2 = fetchTrendingChannels();
    const promise3 = fetchTrendingChannels();

    const [channels1, channels2, channels3] = await Promise.all([
      promise1,
      promise2,
      promise3,
    ]);

    // All should return the same data
    expect(channels1).toEqual(mockChannels);
    expect(channels2).toEqual(mockChannels);
    expect(channels3).toEqual(mockChannels);

    // Fetch should only be called once despite concurrent calls
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
