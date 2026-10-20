import { describe, expect, it } from "bun:test";
import { fetchJson, type Fetch } from "./fetchJson";

describe("fetchJson", () => {
  it("returns the parsed body", async () => {
    const fetch: Fetch = async () => Response.json({ a: 1 });

    expect(await fetchJson(fetch, "https://api.example/x")).toEqual({ a: 1 });
  });

  it("returns undefined for 404 and throws for other errors", async () => {
    const notFound: Fetch = async () => new Response("", { status: 404 });
    const down: Fetch = async () => new Response("", { status: 500 });

    expect(await fetchJson(notFound, "https://api.example/x")).toBeUndefined();
    expect(fetchJson(down, "https://api.example/x")).rejects.toThrow("500");
  });

  it("gives up on requests that take too long", async () => {
    // never answers, but stops when aborted, like the real fetch
    const hanging: Fetch = (_url, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        ),
      );

    expect(fetchJson(hanging, "https://api.example/x", 20)).rejects.toThrow();
  });
});
