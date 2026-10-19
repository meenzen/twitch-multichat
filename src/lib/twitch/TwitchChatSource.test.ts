import { describe, expect, it, mock } from "bun:test";
import { parseTwitchMessage, type ChatClient } from "@twurple/chat";
import { MessageType } from "#lib/chat/ChatMessage.ts";
import type { ChatStatus } from "#lib/chat/ChatSource.ts";
import { TwitchChatSource } from "./TwitchChatSource";

type Handler = (...args: unknown[]) => void;

/** Minimal stand-in for twurple's ChatClient that lets tests fire events */
function stubClient() {
  const handlers: Record<string, Handler> = {};
  const binder = (name: string) => (handler: Handler) => {
    handlers[name] = handler;
  };
  const client = {
    onMessage: binder("message"),
    onAction: binder("action"),
    onMessageRemove: binder("messageRemove"),
    onBan: binder("ban"),
    onTimeout: binder("timeout"),
    onChatClear: binder("chatClear"),
    connect: mock(),
    join: mock((channel: string) => Promise.resolve(void channel)),
    quit: mock(),
  };
  const fire = (name: string, ...args: unknown[]) => handlers[name](...args);
  return { client, fire };
}

function setup() {
  const { client, fire } = stubClient();
  const source = new TwitchChatSource({
    client: client as unknown as ChatClient,
  });
  return { client, fire, source };
}

const rawMessage = parseTwitchMessage(
  "@display-name=Bob;emotes=;id=m1;user-id=9 :bob!bob@bob.tmi.twitch.tv PRIVMSG #chan :\u0001ACTION hi\u0001",
);

describe("TwitchChatSource", () => {
  it("emits parsed messages and actions", () => {
    const { fire, source } = setup();
    const received = mock();
    source.on("message", received);

    fire("message", "chan", "bob", "hi", rawMessage);
    fire("action", "chan", "bob", "hi", rawMessage);

    expect(received).toHaveBeenCalledTimes(2);
    expect(received.mock.calls[0][0].type).toBe(MessageType.Normal);
    expect(received.mock.calls[1][0]).toMatchObject({
      type: MessageType.Action,
      channel: "chan",
      displayName: "Bob",
    });
  });

  it("maps moderation events", () => {
    const { fire, source } = setup();
    const removed = mock();
    const userCleared = mock();
    const channelCleared = mock();
    source.on("messageRemoved", removed);
    source.on("userCleared", userCleared);
    source.on("channelCleared", channelCleared);

    fire("messageRemove", "chan", "m1");
    fire("ban", "chan", "troll");
    fire("timeout", "chan", "spammer", 600);
    fire("chatClear", "chan");

    expect(removed).toHaveBeenCalledWith("m1");
    expect(userCleared.mock.calls).toEqual([
      ["chan", "troll"],
      ["chan", "spammer"],
    ]);
    expect(channelCleared).toHaveBeenCalledWith("chan");
  });

  it("reports progress while joining channels", async () => {
    const { client, source } = setup();
    const statuses: ChatStatus[] = [];
    source.on("status", (status) => statuses.push(status));

    await source.connect(["one", "two"]);

    expect(client.connect).toHaveBeenCalled();
    expect(client.join).toHaveBeenNthCalledWith(1, "one");
    expect(client.join).toHaveBeenNthCalledWith(2, "two");
    expect(statuses).toEqual([
      { kind: "connecting" },
      { kind: "joining", channel: "one" },
      { kind: "joining", channel: "two" },
      { kind: "ready" },
    ]);
  });

  it("reports an error when connecting throws", async () => {
    const { client, source } = setup();
    client.connect.mockImplementation(() => {
      throw new Error("offline");
    });
    const statuses: ChatStatus[] = [];
    source.on("status", (status) => statuses.push(status));

    await source.connect(["one"]);

    expect(statuses.at(-1)?.kind).toBe("error");
    expect(client.join).not.toHaveBeenCalled();
  });

  it("quits the client on disconnect", () => {
    const { client, source } = setup();
    source.disconnect();
    expect(client.quit).toHaveBeenCalled();
  });
});
