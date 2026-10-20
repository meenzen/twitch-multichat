import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import { BttvEmotes } from "./bttv";
import type { EmoteChange } from "./Emote";
import { fakeSockets } from "./fakeSocket";

function setup() {
  const { sockets, create, latest } = fakeSockets();
  const provider = new BttvEmotes(
    mock(async () => new Response("", { status: 404 })),
    create,
  );
  const changes: [string, EmoteChange][] = [];
  const watch = (channelId: string) =>
    provider.watch(channelId, (change) => changes.push([channelId, change]));
  return { provider, sockets, latest, changes, watch };
}

const join = (id: string) => ({
  name: "join_channel",
  data: { name: `twitch:${id}` },
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("BttvEmotes live updates", () => {
  it("joins watched channels once connected", () => {
    const { latest, watch } = setup();
    watch("1");
    watch("2");

    expect(latest().url).toBe("wss://sockets.betterttv.net/ws");
    latest().open();

    expect(latest().sent).toEqual([join("1"), join("2")]);
  });

  it("turns created, renamed and deleted emotes into changes", () => {
    const { latest, changes, watch } = setup();
    watch("1");
    latest().open();

    latest().receive({
      name: "emote_create",
      data: {
        channel: "twitch:1",
        emote: {
          id: "e1",
          code: "PepePls",
          imageType: "gif",
          animated: true,
          user: { id: "u", name: "someone" },
        },
      },
    });
    // updates only carry what changed
    latest().receive({
      name: "emote_update",
      data: { channel: "twitch:1", emote: { id: "e1", code: "PepeDance" } },
    });
    latest().receive({
      name: "emote_delete",
      data: { channel: "twitch:1", emoteId: "e1" },
    });
    // not watched, and other kinds of messages
    latest().receive({
      name: "emote_delete",
      data: { channel: "twitch:9", emoteId: "x" },
    });
    latest().receive({
      name: "lookup_user",
      data: { channel: "twitch:1", name: "someone", pro: true },
    });

    expect(changes).toEqual([
      [
        "1",
        {
          kind: "add",
          emote: {
            id: "e1",
            code: "PepePls",
            provider: "bttv",
            images: [1, 2, 3].map((density) => ({
              url: `https://cdn.betterttv.net/emote/e1/${density}x.webp`,
              density,
            })),
          },
        },
      ],
      [
        "1",
        {
          kind: "update",
          emote: expect.objectContaining({ code: "PepeDance" }),
        },
      ],
      ["1", { kind: "remove", id: "e1" }],
    ]);
  });

  it("rejoins and reloads after reconnecting", () => {
    const { sockets, latest, changes, watch } = setup();
    watch("1");
    latest().open();

    latest().drop();
    jest.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
    latest().open();

    expect(latest().sent).toEqual([join("1")]);
    expect(changes).toEqual([["1", { kind: "reload" }]]);
  });

  it("does not reconnect just because it is quiet", () => {
    const { sockets, latest, watch } = setup();
    watch("1");
    latest().open();

    jest.advanceTimersByTime(60 * 60 * 1000);

    expect(sockets).toHaveLength(1);
  });

  it("parts channels and closes once nothing is watched", () => {
    const { latest, watch } = setup();
    const stop1 = watch("1");
    const stop2 = watch("2");
    latest().open();
    latest().sent = [];

    stop1();
    expect(latest().closed).toBe(false);
    stop2();

    expect(latest().sent).toEqual([
      { name: "part_channel", data: { name: "twitch:1" } },
      { name: "part_channel", data: { name: "twitch:2" } },
    ]);
    expect(latest().closed).toBe(true);
  });
});
