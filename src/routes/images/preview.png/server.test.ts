import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  mock,
} from "bun:test";
import type { RequestEvent } from "@sveltejs/kit";
import { expectImageSnapshot } from "../../../../test/imageSnapshot";

// Renders the real route (satori + resvg) and compares the PNGs to known
// good ones. See test/imageSnapshot.ts for updating them.

mock.module(
  "#lib/components/PreviewImage.svelte",
  () => import("#lib/components/PreviewImage.svelte?server"),
);
const { GET } = await import("./+server");

const origin = "https://multichat.test";

// The route must not make any request: fonts and logo are bundled. data:
// URLs are fine (satori loads its layout engine's WebAssembly from one).
const realFetch = globalThis.fetch;
const requests: string[] = [];
beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.protocol === "data:") return Bun.fetch(input, init);
    requests.push(url.href);
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;
});
afterEach(() => {
  expect(requests).toEqual([]);
});
afterAll(() => {
  globalThis.fetch = realFetch;
});

async function render(channels: string[]): Promise<ArrayBuffer> {
  const url = new URL("/images/preview.png", origin);
  for (const channel of channels) url.searchParams.append("channel", channel);
  const response = await GET({ url } as RequestEvent);
  return response.arrayBuffer();
}

describe("preview image", () => {
  const cases: [name: string, channels: string[]][] = [
    ["landing", []],
    ["one-channel", ["speedrunner"]],
    ["two-channels", ["foo", "bar"]],
    ["many-channels", Array.from({ length: 12 }, (_, i) => `channel${i + 1}`)],
    // 25 characters, the longest name Twitch allows
    ["long-names", ["a_very_long_channel_name1", "another_long_name"]],
    // invalid names are dropped (emoji would be fetched from a CDN)
    ["two-channels", ["foo", "😀", "x", "bar", "a".repeat(26)]],
  ];

  for (const [name, channels] of cases) {
    it(`matches the snapshot: ${name} (${channels.join(", ")})`, async () => {
      await expectImageSnapshot(import.meta.path, name, await render(channels));
    }, 30_000);
  }
});
