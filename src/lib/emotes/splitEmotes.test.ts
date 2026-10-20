import { describe, expect, it } from "bun:test";
import { MessagePartType, type MessagePart } from "#lib/chat/ChatMessage.ts";
import type { Emote } from "./Emote";
import { splitEmotes } from "./splitEmotes";

const kkona: Emote = {
  id: "k1",
  code: "KKona",
  images: [{ url: "https://cdn.betterttv.net/emote/k1/1x.webp", density: 1 }],
  provider: "bttv",
};
const emotes = new Map([["KKona", kkona]]);

const text = (content: string): MessagePart => ({
  type: MessagePartType.Text,
  content,
});

const kkonaPart: MessagePart = {
  type: MessagePartType.Emote,
  content: "k1",
  emoteName: "KKona",
  emoteImages: [
    { url: "https://cdn.betterttv.net/emote/k1/1x.webp", density: 1 },
  ],
  emoteProvider: "bttv",
};

describe("splitEmotes", () => {
  it("turns emote codes into emote parts and keeps the text around them", () => {
    expect(splitEmotes([text("hi KKona  there KKona")], emotes)).toEqual([
      text("hi "),
      kkonaPart,
      text("  there "),
      kkonaPart,
    ]);
  });

  it("only matches whole, case-sensitive words", () => {
    const parts = [text("kkona KKonaW xKKona KKona!")];

    expect(splitEmotes(parts, emotes)).toEqual(parts);
  });

  it("leaves other parts alone", () => {
    const twitch: MessagePart = {
      type: MessagePartType.Emote,
      content: "25",
      emoteName: "Kappa",
    };

    expect(splitEmotes([text("KKona "), twitch], emotes)).toEqual([
      kkonaPart,
      text(" "),
      twitch,
    ]);
  });

  it("does not treat object properties as emotes", () => {
    const parts = [text("constructor toString __proto__")];

    expect(splitEmotes(parts, emotes)).toEqual(parts);
  });
});

describe("splitEmotes with zero-width emotes", () => {
  const rain: Emote = {
    id: "r1",
    code: "RainTime",
    images: [{ url: "https://cdn.7tv.app/emote/r1/1x.webp", density: 1 }],
    provider: "7tv",
    zeroWidth: true,
  };
  const withRain = new Map([
    ["KKona", kkona],
    ["RainTime", rain],
  ]);
  const rainPart: MessagePart = {
    type: MessagePartType.Emote,
    content: "r1",
    emoteName: "RainTime",
    emoteImages: [{ url: "https://cdn.7tv.app/emote/r1/1x.webp", density: 1 }],
    emoteProvider: "7tv",
  };

  it("stacks them on the emote before, dropping the space between", () => {
    expect(
      splitEmotes([text("look KKona  RainTime RainTime now")], withRain),
    ).toEqual([
      text("look "),
      { ...kkonaPart, emoteOverlays: [rainPart, rainPart] },
      text(" now"),
    ]);
  });

  it("stacks them on Twitch emotes without changing the original part", () => {
    const twitch: MessagePart = {
      type: MessagePartType.Emote,
      content: "25",
      emoteName: "Kappa",
    };

    expect(splitEmotes([twitch, text(" RainTime")], withRain)).toEqual([
      { ...twitch, emoteOverlays: [rainPart] },
    ]);
    expect(twitch.emoteOverlays).toBeUndefined();
  });

  it("shows them on their own without an emote before", () => {
    expect(splitEmotes([text("RainTime here")], withRain)).toEqual([
      rainPart,
      text(" here"),
    ]);
    expect(splitEmotes([text("rain RainTime")], withRain)).toEqual([
      text("rain "),
      rainPart,
    ]);
  });
});
