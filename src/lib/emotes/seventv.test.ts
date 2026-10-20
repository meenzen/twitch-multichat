import { describe, expect, it, mock } from "bun:test";
import { SevenTvEmotes } from "./seventv";

/** fetch stand-in that answers by URL */
function fakeFetch(routes: Record<string, unknown>) {
  return mock(async (url: string) => {
    if (!(url in routes)) return new Response("not found", { status: 404 });
    const body = routes[url];
    return body instanceof Response ? body : Response.json(body);
  });
}

const api = "https://7tv.io/v3";

describe("SevenTvEmotes", () => {
  it("loads the global set with CDN images", async () => {
    const fetch = fakeFetch({
      [`${api}/emote-sets/global`]: {
        id: "global",
        emotes: [
          { id: "e1", name: "PepePls", flags: 0, data: { flags: 0 } },
          { id: "e2", name: "RainTime", flags: 1, data: { flags: 256 } },
        ],
      },
    });

    expect(await new SevenTvEmotes(fetch).global()).toEqual([
      {
        id: "e1",
        code: "PepePls",
        url: "https://cdn.7tv.app/emote/e1/1x.webp",
        provider: "7tv",
        zeroWidth: false,
      },
      {
        id: "e2",
        code: "RainTime",
        url: "https://cdn.7tv.app/emote/e2/1x.webp",
        provider: "7tv",
        zeroWidth: true,
      },
    ]);
  });

  it("uses the channel's names and zero-width flags", async () => {
    const fetch = fakeFetch({
      [`${api}/users/twitch/123`]: {
        emote_set: {
          emotes: [
            // renamed in this channel
            { id: "a", name: "Dance", data: { name: "PepePls", flags: 0 } },
            // made zero-width by the channel
            { id: "b", name: "Hat", flags: 1, data: { flags: 0 } },
            // zero-width by design
            { id: "c", name: "Rain", data: { flags: 256 } },
          ],
        },
      },
    });

    const emotes = await new SevenTvEmotes(fetch).channel("123");

    expect(emotes.map((e) => [e.code, e.zeroWidth])).toEqual([
      ["Dance", false],
      ["Hat", true],
      ["Rain", true],
    ]);
  });

  it("has no emotes for channels without 7TV or without a set", async () => {
    const fetch = fakeFetch({ [`${api}/users/twitch/2`]: { emote_set: null } });
    const provider = new SevenTvEmotes(fetch);

    expect(await provider.channel("1")).toEqual([]);
    expect(await provider.channel("2")).toEqual([]);
  });

  it("leaves out malformed entries", async () => {
    const fetch = fakeFetch({
      [`${api}/emote-sets/global`]: {
        emotes: [
          null,
          { id: "x" },
          { id: "y", name: "" },
          { id: "z", name: "ok" },
        ],
      },
    });

    const emotes = await new SevenTvEmotes(fetch).global();

    expect(emotes.map((e) => e.code)).toEqual(["ok"]);
  });

  it("fails on server errors", async () => {
    const fetch = fakeFetch({
      [`${api}/emote-sets/global`]: new Response("down", { status: 502 }),
    });

    expect(new SevenTvEmotes(fetch).global()).rejects.toThrow("502");
  });
});
