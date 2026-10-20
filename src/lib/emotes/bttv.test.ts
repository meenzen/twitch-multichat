import { describe, expect, it, mock } from "bun:test";
import { BttvEmotes } from "./bttv";

/** fetch stand-in that answers by URL */
function fakeFetch(routes: Record<string, unknown>) {
  return mock(async (url: string) => {
    if (!(url in routes)) return new Response("not found", { status: 404 });
    const body = routes[url];
    return body instanceof Response ? body : Response.json(body);
  });
}

const api = "https://api.betterttv.net/3";

describe("BttvEmotes", () => {
  it("loads global emotes with their CDN image", async () => {
    const fetch = fakeFetch({
      [`${api}/cached/emotes/global`]: [
        { id: "a1", code: "monkaS", imageType: "png", animated: false },
      ],
    });

    expect(await new BttvEmotes(fetch).global()).toEqual([
      {
        id: "a1",
        code: "monkaS",
        images: [1, 2, 3].map((density) => ({
          url: `https://cdn.betterttv.net/emote/a1/${density}x.webp`,
          density,
        })),
        provider: "bttv",
      },
    ]);
  });

  it("leaves out modifiers and malformed entries", async () => {
    const fetch = fakeFetch({
      [`${api}/cached/emotes/global`]: [
        { id: "m", code: "h!", modifier: true },
        { id: "x" },
        { id: "e", code: "" },
        null,
        { id: "ok", code: "KKona", modifier: false },
      ],
    });

    const emotes = await new BttvEmotes(fetch).global();

    expect(emotes.map((e) => e.code)).toEqual(["KKona"]);
  });

  it("combines shared and channel emotes of a channel", async () => {
    const fetch = fakeFetch({
      [`${api}/cached/users/twitch/123`]: {
        id: "u",
        channelEmotes: [{ id: "c", code: "forsenE" }],
        sharedEmotes: [{ id: "s", code: "catJAM" }],
      },
    });

    const emotes = await new BttvEmotes(fetch).channel("123");

    expect(emotes.map((e) => e.code)).toEqual(["catJAM", "forsenE"]);
  });

  it("has no emotes for channels without BetterTTV", async () => {
    const fetch = fakeFetch({});

    expect(await new BttvEmotes(fetch).channel("404")).toEqual([]);
  });

  it("fails on server errors", async () => {
    const fetch = fakeFetch({
      [`${api}/cached/emotes/global`]: new Response("down", { status: 503 }),
    });

    expect(new BttvEmotes(fetch).global()).rejects.toThrow("503");
  });
});
