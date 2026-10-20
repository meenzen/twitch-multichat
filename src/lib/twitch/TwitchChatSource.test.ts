import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import { parseTwitchMessage, type ChatClient } from "@twurple/chat";
import { MessagePartType, MessageType } from "#lib/chat/ChatMessage.ts";
import type { ChatStatus } from "#lib/chat/ChatSource.ts";
import type { EmoteMap } from "#lib/emotes/Emote.ts";
import { TwitchChatSource } from "./TwitchChatSource";

type Handler = (...args: unknown[]) => void;

/** Minimal stand-in for twurple's ChatClient that lets tests fire events */
function stubClient() {
  const handlers: Record<string, Handler> = {};
  const binder = (name: string) => (handler: Handler) => {
    handlers[name] = handler;
  };
  const fire = (name: string, ...args: unknown[]) => handlers[name](...args);
  const client = {
    onMessage: binder("message"),
    onAction: binder("action"),
    onMessageRemove: binder("messageRemove"),
    onBan: binder("ban"),
    onTimeout: binder("timeout"),
    onChatClear: binder("chatClear"),
    onAuthenticationSuccess: binder("authSuccess"),
    onDisconnect: binder("disconnect"),
    isConnected: false,
    isConnecting: false,
    // like twurple: connecting leads to authentication
    connect: mock(() => {
      client.isConnected = true;
      queueMicrotask(() => fire("authSuccess"));
    }),
    reconnect: mock(),
    join: mock((channel: string): Promise<void> =>
      Promise.resolve(void channel),
    ),
    quit: mock(),
    irc: { pingCheck: mock(), onAnyMessage: binder("ircMessage") },
  };
  return { client, fire };
}

/** document/window stand-ins for page lifecycle events */
function fakePage() {
  const document = Object.assign(new EventTarget(), {
    visibilityState: "visible" as DocumentVisibilityState,
  });
  const window = new EventTarget();
  return { document, window };
}

function setup() {
  const { client, fire } = stubClient();
  const page = fakePage();
  const source = new TwitchChatSource({
    client: client as unknown as ChatClient,
    ...page,
  });
  const statuses: ChatStatus[] = [];
  source.on("status", (status) => statuses.push(status));
  return { client, fire, source, statuses, ...page };
}

/** let pending promise callbacks run */
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => queueMicrotask(r));
};

const rawMessage = parseTwitchMessage(
  "@display-name=Bob;emotes=;id=m1;user-id=9 :bob!bob@bob.tmi.twitch.tv PRIVMSG #chan :\u0001ACTION hi\u0001",
);

beforeEach(() => {
  // keep the test output clean
  for (const level of ["log", "debug", "warn", "error"] as const) {
    jest.spyOn(console, level).mockImplementation(() => {});
  }
});

afterEach(() => {
  jest.restoreAllMocks();
});

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

  it("joins all channels once authenticated", async () => {
    const { client, source, statuses } = setup();

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
    const { client, source, statuses } = setup();
    client.connect.mockImplementation(() => {
      throw new Error("offline");
    });

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

describe("TwitchChatSource reconnecting", () => {
  it("rejoins all channels after an unexpected disconnect", async () => {
    const { client, fire, source, statuses } = setup();
    await source.connect(["one", "two"]);
    client.join.mockClear();
    statuses.length = 0;

    fire("disconnect", false, new Error("socket closed"));
    // twurple reconnects by itself and authenticates again
    fire("authSuccess");
    await flush();

    expect(client.join.mock.calls).toEqual([["one"], ["two"]]);
    expect(statuses).toEqual([
      { kind: "reconnecting", since: expect.any(Number) },
      { kind: "joining", channel: "one" },
      { kind: "joining", channel: "two" },
      { kind: "ready" },
    ]);
  });

  it("abandons a join round interrupted by a disconnect", async () => {
    const { client, fire, source, statuses } = setup();
    await source.connect(["one"]);
    statuses.length = 0;

    let finishJoin!: () => void;
    client.join.mockImplementationOnce(
      () => new Promise<void>((r) => (finishJoin = r)),
    );
    fire("authSuccess");
    fire("disconnect", false);
    finishJoin();
    await flush();

    // no "ready" from the stale round
    expect(statuses).toEqual([
      { kind: "joining", channel: "one" },
      { kind: "reconnecting", since: expect.any(Number) },
    ]);
  });

  it("reports when the last line arrived before the connection dropped", async () => {
    jest.useFakeTimers();
    try {
      const { fire, source, statuses } = setup();
      await source.connect(["one"]);

      jest.setSystemTime(new Date(1_000_000));
      fire(
        "ircMessage",
        parseTwitchMessage(":tmi.twitch.tv PONG tmi.twitch.tv :tmi.twitch.tv"),
      );
      // the drop is only noticed later, e.g. after the phone woke up
      jest.setSystemTime(new Date(1_300_000));
      fire("disconnect", false);

      expect(statuses.at(-1)).toEqual({
        kind: "reconnecting",
        since: 1_000_000,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("does not report reconnecting after a manual disconnect", async () => {
    const { fire, source, statuses } = setup();
    await source.connect(["one"]);
    statuses.length = 0;

    source.disconnect();
    fire("disconnect", true);
    fire("authSuccess");
    await flush();

    expect(statuses).toEqual([]);
  });
});

describe("TwitchChatSource page resume", () => {
  it("pings when the page becomes visible again", async () => {
    const { client, document, source } = setup();
    await source.connect(["one"]);

    document.dispatchEvent(new Event("visibilitychange"));

    expect(client.irc.pingCheck).toHaveBeenCalledTimes(1);
    expect(client.reconnect).not.toHaveBeenCalled();
  });

  it("ignores the page being hidden", async () => {
    const { client, document, source } = setup();
    await source.connect(["one"]);

    document.visibilityState = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));

    expect(client.irc.pingCheck).not.toHaveBeenCalled();
  });

  it("reconnects right away when the connection is already gone", async () => {
    const { client, window, source } = setup();
    await source.connect(["one"]);
    client.isConnected = false;

    window.dispatchEvent(new Event("online"));

    expect(client.reconnect).toHaveBeenCalledTimes(1);
    expect(client.irc.pingCheck).not.toHaveBeenCalled();
  });

  it("leaves a reconnect that is already underway alone", async () => {
    const { client, window, source } = setup();
    await source.connect(["one"]);
    client.isConnected = false;
    client.isConnecting = true;

    window.dispatchEvent(new Event("pageshow"));

    expect(client.reconnect).not.toHaveBeenCalled();
  });

  it("checks on resume from a frozen page", async () => {
    const { client, document, source } = setup();
    await source.connect(["one"]);

    document.dispatchEvent(new Event("resume"));

    expect(client.irc.pingCheck).toHaveBeenCalledTimes(1);
  });

  it("checks at most every few seconds", async () => {
    const { client, document, window, source } = setup();
    await source.connect(["one"]);
    const now = jest.spyOn(Date, "now").mockReturnValue(100_000);

    // several lifecycle events usually arrive together on wake up
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("pageshow"));
    window.dispatchEvent(new Event("online"));
    expect(client.irc.pingCheck).toHaveBeenCalledTimes(1);

    now.mockReturnValue(106_000);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(client.irc.pingCheck).toHaveBeenCalledTimes(2);
  });

  describe("third-party emotes", () => {
    /** A source with an emote loader whose requests the test answers */
    function setupEmotes() {
      const { client, fire } = stubClient();
      const pending: ((emotes: EmoteMap) => void)[] = [];
      const loadEmotes = mock(
        () => new Promise<EmoteMap>((resolve) => pending.push(resolve)),
      );
      const source = new TwitchChatSource({
        client: client as unknown as ChatClient,
        loadEmotes,
        ...fakePage(),
      });
      const events: unknown[] = [];
      source.on("message", (m) =>
        events.push(m.parts.map((p) => p.emoteName ?? p.content).join("|")),
      );
      source.on("messageRemoved", (id) => events.push(`removed ${id}`));
      return { fire, loadEmotes, pending, events };
    }

    const kkona: EmoteMap = new Map([
      [
        "KKona",
        { id: "k1", code: "KKona", url: "https://cdn/k1", provider: "bttv" },
      ],
    ]);

    const privmsg = (id: string, text: string) =>
      parseTwitchMessage(
        `@emotes=;id=${id};room-id=123;user-id=9 :bob!bob@bob.tmi.twitch.tv PRIVMSG #Chan :${text}`,
      );

    it("starts loading a channel's emotes on ROOMSTATE", () => {
      const { fire, loadEmotes } = setupEmotes();

      fire(
        "ircMessage",
        parseTwitchMessage("@room-id=123 :tmi.twitch.tv ROOMSTATE #chan"),
      );

      expect(loadEmotes).toHaveBeenCalledWith("123");
    });

    it("holds messages and removals until the emotes are there", async () => {
      const { fire, loadEmotes, pending, events } = setupEmotes();

      fire("message", "chan", "bob", "hi KKona", privmsg("m1", "hi KKona"));
      fire("messageRemove", "chan", "m1");
      expect(loadEmotes).toHaveBeenCalledWith("123");
      expect(events).toEqual([]);

      pending[0](kkona);
      await flush();

      expect(events).toEqual(["hi |KKona", "removed m1"]);
    });

    it("passes messages through without a loader", () => {
      const { fire, source } = setup();
      const received = mock();
      source.on("message", received);

      fire("message", "chan", "bob", "KKona", privmsg("m1", "KKona"));

      expect(received.mock.calls[0][0].parts).toEqual([
        { type: MessagePartType.Text, content: "KKona" },
      ]);
    });
  });

  it("stops watching the page after disconnect", async () => {
    const { client, document, window, source } = setup();
    await source.connect(["one"]);

    source.disconnect();
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));

    expect(client.irc.pingCheck).not.toHaveBeenCalled();
    expect(client.reconnect).not.toHaveBeenCalled();
  });
});
