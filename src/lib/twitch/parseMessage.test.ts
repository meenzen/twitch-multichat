import { describe, expect, it } from "bun:test";
import { parseTwitchMessage, type ChatMessage } from "@twurple/chat";
import { MessagePartType, MessageType } from "#lib/chat/ChatMessage.ts";
import { parseMessage } from "./parseMessage";

function privmsg(text: string, tags: Record<string, string> = {}): ChatMessage {
  const allTags = {
    color: "#FF0000",
    "display-name": "Alice",
    emotes: "",
    id: "msg-1",
    "user-id": "1234",
    ...tags,
  };
  const tagString = Object.entries(allTags)
    .map(([key, value]) => `${key}=${value}`)
    .join(";");
  return parseTwitchMessage(
    `@${tagString} :alice!alice@alice.tmi.twitch.tv PRIVMSG #SomeChannel :${text}`,
  ) as ChatMessage;
}

describe("parseMessage", () => {
  it("maps user and channel information", () => {
    const parsed = parseMessage({
      message: privmsg("hello"),
      type: MessageType.Normal,
    });

    expect(parsed).toMatchObject({
      id: "msg-1",
      type: MessageType.Normal,
      channel: "somechannel",
      userId: "1234",
      userName: "alice",
      displayName: "Alice",
      userColor: "#FF0000",
      parts: [{ type: MessagePartType.Text, content: "hello" }],
    });
  });

  it("splits emotes into separate parts", () => {
    const parsed = parseMessage({
      message: privmsg("hi Kappa there", { emotes: "25:3-7" }),
      type: MessageType.Normal,
    });

    expect(parsed.parts).toEqual([
      { type: MessagePartType.Text, content: "hi " },
      { type: MessagePartType.Emote, content: "25", emoteName: "Kappa" },
      { type: MessagePartType.Text, content: " there" },
    ]);
  });

  it("strips the CTCP ACTION wrapper from /me messages", () => {
    const parsed = parseMessage({
      message: privmsg("\u0001ACTION waves\u0001"),
      type: MessageType.Action,
    });

    expect(parsed.parts).toEqual([
      { type: MessagePartType.Text, content: "waves" },
    ]);
  });

  it("turns URLs into link parts", () => {
    const parsed = parseMessage({
      message: privmsg("Kappa twitch.tv/foo", { emotes: "25:0-4" }),
      type: MessageType.Normal,
    });

    expect(parsed.parts).toEqual([
      { type: MessagePartType.Emote, content: "25", emoteName: "Kappa" },
      { type: MessagePartType.Text, content: " " },
      {
        type: MessagePartType.Link,
        content: "twitch.tv/foo",
        href: "http://twitch.tv/foo",
      },
    ]);
  });

  describe("third-party emotes", () => {
    const kkona = {
      id: "k1",
      code: "KKona",
      url: "https://cdn.betterttv.net/emote/k1/1x.webp",
      provider: "bttv" as const,
    };
    const emotes = new Map([["KKona", kkona]]);
    const kkonaPart = {
      type: MessagePartType.Emote,
      content: "k1",
      emoteName: "KKona",
      emoteUrl: kkona.url,
      emoteProvider: "bttv",
    };

    it("finds them in the text around Twitch's own emotes", () => {
      const parsed = parseMessage(
        {
          message: privmsg("Kappa KKona", { emotes: "25:0-4" }),
          type: MessageType.Normal,
        },
        emotes,
      );

      expect(parsed.parts).toEqual([
        { type: MessagePartType.Emote, content: "25", emoteName: "Kappa" },
        { type: MessagePartType.Text, content: " " },
        kkonaPart,
      ]);
    });

    it("finds them at the end of /me messages", () => {
      const parsed = parseMessage(
        {
          message: privmsg("\u0001ACTION waves KKona\u0001"),
          type: MessageType.Action,
        },
        emotes,
      );

      expect(parsed.parts).toEqual([
        { type: MessagePartType.Text, content: "waves " },
        kkonaPart,
      ]);
    });
  });

  it("takes the timestamp from the sent time", () => {
    const parsed = parseMessage({
      message: privmsg("hi", { "tmi-sent-ts": "1700000000000" }),
      type: MessageType.Normal,
    });
    expect(parsed.timestamp).toBe(1700000000000);
  });

  it("falls back to the current time without a sent time", () => {
    const before = Date.now();
    const parsed = parseMessage({
      message: privmsg("hi"),
      type: MessageType.Normal,
    });
    expect(parsed.timestamp).toBeGreaterThanOrEqual(before);
    expect(parsed.timestamp).toBeLessThanOrEqual(Date.now());
  });
});
