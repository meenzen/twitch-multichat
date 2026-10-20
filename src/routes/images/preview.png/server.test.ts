import { afterAll, beforeAll, describe, it, mock } from "bun:test";
import { join } from "node:path";
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
const staticDir = join(import.meta.dir, "../../../../static");

// satori fetches the logo from the site itself, served here from static/.
// Nothing else may be fetched: fonts are bundled.
const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.origin === origin) {
      const file = Bun.file(join(staticDir, url.pathname));
      return new Response(await file.arrayBuffer(), {
        headers: { "Content-Type": file.type },
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;
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
    ["long-names", ["a_very_long_channel_name_1", "another_long_name"]],
  ];

  for (const [name, channels] of cases) {
    it(`matches the snapshot: ${name}`, async () => {
      await expectImageSnapshot(import.meta.path, name, await render(channels));
    }, 30_000);
  }
});
