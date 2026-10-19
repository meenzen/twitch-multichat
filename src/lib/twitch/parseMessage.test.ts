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
});
