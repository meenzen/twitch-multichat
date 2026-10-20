import { describe, expect, it } from "bun:test";
import { MessagePartType, type MessagePart } from "#lib/chat/ChatMessage.ts";
import type { Emote } from "./Emote";
import { splitEmotes } from "./splitEmotes";

const kkona: Emote = {
  id: "k1",
  code: "KKona",
  url: "https://cdn.betterttv.net/emote/k1/1x.webp",
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
  emoteUrl: "https://cdn.betterttv.net/emote/k1/1x.webp",
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
