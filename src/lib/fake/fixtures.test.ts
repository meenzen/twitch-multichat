import { describe, expect, it } from "bun:test";
import { MessagePartType } from "#lib/chat/ChatMessage.ts";
import { randomMessages, seededRandom, textToParts } from "./fixtures";

describe("textToParts", () => {
  it("turns emote names into emotes and keeps the text around them", () => {
    expect(textToParts("LETS GO PogChamp PogChamp")).toEqual([
      { type: MessagePartType.Text, content: "LETS GO " },
      {
        type: MessagePartType.Emote,
        content: "305954156",
        emoteName: "PogChamp",
      },
      { type: MessagePartType.Text, content: " " },
      {
        type: MessagePartType.Emote,
        content: "305954156",
        emoteName: "PogChamp",
      },
    ]);
  });

  it("only matches whole, case-sensitive emote names", () => {
    expect(textToParts("kappa Kappa123 constructor")).toEqual([
      { type: MessagePartType.Text, content: "kappa Kappa123 constructor" },
    ]);
  });

  it("splits out links", () => {
    expect(textToParts("clip: clips.twitch.tv/Foo")).toEqual([
      { type: MessagePartType.Text, content: "clip: " },
      {
        type: MessagePartType.Link,
        content: "clips.twitch.tv/Foo",
        href: "http://clips.twitch.tv/Foo",
      },
    ]);
  });
});

describe("randomMessages", () => {
  it("is reproducible for a seed", () => {
    // ids are a global counter, compare everything else
    const strip = (seed: number) =>
      randomMessages(20, seededRandom(seed)).map((m) => ({ ...m, id: "" }));

    expect(strip(7)).toEqual(strip(7));
    expect(strip(7)).not.toEqual(strip(8));
  });

  it("produces varied messages with emotes, links and actions", () => {
    const messages = randomMessages(500, seededRandom(1));
    const parts = messages.flatMap((m) => m.parts);

    expect(new Set(messages.map((m) => m.userName)).size).toBeGreaterThan(30);
    expect(parts.some((p) => p.type === MessagePartType.Emote)).toBe(true);
    expect(parts.some((p) => p.type === MessagePartType.Link)).toBe(true);
    expect(messages.some((m) => m.type !== messages[0].type)).toBe(true);
    // never an empty text part
    expect(parts.every((p) => p.content.length > 0)).toBe(true);
  });
});
