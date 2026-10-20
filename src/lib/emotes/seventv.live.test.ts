import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import type { EmoteChange } from "./Emote";
import { fakeSockets } from "./fakeSocket";
import { SevenTvEmotes } from "./seventv";

const api = "https://7tv.io/v3";

/** The channel answers with this account, set and emotes */
function account(setId: string, emotes: { id: string; name: string }[] = []) {
  return { user: { id: "user-1" }, emote_set: { id: setId, emotes } };
}

function setup() {
  const accounts: Record<string, unknown> = {
    [`${api}/users/twitch/123`]: account("set-1", [{ id: "e1", name: "Old" }]),
  };
  const fetch = mock(async (url: string) =>
    url in accounts
      ? Response.json(accounts[url])
      : new Response("", { status: 404 }),
  );
  const { sockets, create, latest } = fakeSockets();
  const provider = new SevenTvEmotes(fetch, create);
  const changes: EmoteChange[] = [];
  const watch = async (channelId = "123") => {
    await provider.channel(channelId);
    return provider.watch(channelId, (change) => changes.push(change));
  };
  return { provider, accounts, sockets, latest, changes, watch };
}

/** An emote as 7TV sends it in a set */
const activeEmote = (id: string, name: string, flags = 0) => ({
  id,
  name,
  flags,
  data: {
    id,
    name,
    flags: 0,
    host: {
      url: `//cdn.7tv.app/emote/${id}`,
      files: [{ name: "1x.webp", width: 32, height: 32, format: "WEBP" }],
    },
  },
});

const dispatch = (type: string, body: object) => ({
  op: 0,
  d: { type, body },
});

beforeEach(() => {
  jest.useFakeTimers();
  for (const level of ["log", "warn"] as const) {
    jest.spyOn(console, level).mockImplementation(() => {});
  }
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("SevenTvEmotes live updates", () => {
  it("subscribes to the channel's emote set and account", async () => {
    const { latest, watch } = setup();
    await watch();

    expect(latest().url).toBe("wss://events.7tv.io/v3");
    latest().open();

    expect(latest().sent).toEqual([
      {
        op: 35,
        d: { type: "emote_set.update", condition: { object_id: "set-1" } },
      },
      {
        op: 35,
        d: { type: "user.update", condition: { object_id: "user-1" } },
      },
    ]);
  });

  it("subscribes to a shared set only once", async () => {
    const { accounts, latest, watch } = setup();
    accounts[`${api}/users/twitch/456`] = account("set-1");
    await watch("123");
    await watch("456");
    latest().open();

    const sets = latest().sent.filter(
      (m) => (m as { d: { type: string } }).d.type === "emote_set.update",
    );
    expect(sets).toHaveLength(1);
  });

  it("turns set changes into added, removed and renamed emotes", async () => {
    const { latest, changes, watch } = setup();
    await watch();
    latest().open();

    latest().receive(
      dispatch("emote_set.update", {
        id: "set-1",
        pushed: [
          { key: "emotes", index: 1, value: activeEmote("e2", "Hat", 1) },
        ],
        pulled: [
          { key: "emotes", index: 0, old_value: activeEmote("e1", "Old") },
        ],
        updated: [
          {
            key: "emotes",
            index: 2,
            old_value: activeEmote("e3", "Before"),
            value: activeEmote("e3", "After"),
          },
        ],
      }),
    );
    // other sets, e.g. chatters' personal emotes, are not the channel's
    latest().receive(
      dispatch("emote_set.update", {
        id: "personal",
        pushed: [{ key: "emotes", value: activeEmote("p", "Mine") }],
      }),
    );

    expect(
      changes.map((c) => [c.kind, "emote" in c ? c.emote.code : c]),
    ).toEqual([
      ["add", "Hat"],
      ["remove", { kind: "remove", id: "e1" }],
      ["update", "After"],
    ]);
    expect(changes[0]).toMatchObject({
      emote: {
        zeroWidth: true,
        images: [{ url: "https://cdn.7tv.app/emote/e2/1x.webp", density: 1 }],
      },
    });
  });

  it("reloads and follows the new set when the channel switches sets", async () => {
    const { accounts, latest, changes, provider, watch } = setup();
    await watch();
    latest().open();

    latest().receive(
      dispatch("user.update", {
        id: "user-1",
        updated: [
          {
            key: "connections",
            index: 0,
            nested: true,
            value: [
              {
                key: "emote_set",
                old_value: { id: "set-1" },
                value: { id: "set-2" },
              },
            ],
          },
        ],
      }),
    );
    expect(changes).toEqual([{ kind: "reload" }]);

    // the loader reloads the channel, which reveals the new set
    accounts[`${api}/users/twitch/123`] = account("set-2");
    latest().sent = [];
    await provider.channel("123");

    expect(latest().sent).toEqual([
      {
        op: 36,
        d: { type: "emote_set.update", condition: { object_id: "set-1" } },
      },
      {
        op: 35,
        d: { type: "emote_set.update", condition: { object_id: "set-2" } },
      },
    ]);
  });

  it("ignores account updates that don't switch the set", async () => {
    const { latest, changes, watch } = setup();
    await watch();
    latest().open();

    latest().receive(
      dispatch("user.update", {
        id: "user-1",
        updated: [{ key: "display_name", old_value: "a", value: "b" }],
      }),
    );

    expect(changes).toEqual([]);
  });

  it("resubscribes and reloads after reconnecting", async () => {
    const { sockets, latest, changes, watch } = setup();
    await watch();
    latest().open();

    latest().drop();
    jest.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
    latest().open();

    expect(latest().sent).toHaveLength(2);
    expect(changes).toEqual([{ kind: "reload" }]);
  });

  it("reconnects when the server asks to", async () => {
    const { sockets, latest, watch } = setup();
    await watch();
    latest().open();

    latest().receive({ op: 4, d: { reason: "ttl expired" } });
    jest.advanceTimersByTime(1000);

    expect(sockets[0].closed).toBe(true);
    expect(sockets).toHaveLength(2);
  });

  it("reconnects after three missed heartbeats", async () => {
    const { sockets, latest, watch } = setup();
    await watch();
    latest().open();
    latest().receive({ op: 1, d: { heartbeat_interval: 10_000 } });

    jest.advanceTimersByTime(29_000);
    latest().receive({ op: 2, d: { count: 1 } });
    jest.advanceTimersByTime(29_000);
    expect(sockets).toHaveLength(1);

    jest.advanceTimersByTime(1000);
    jest.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
  });

  it("unsubscribes and closes once nothing is watched", async () => {
    const { latest, watch } = setup();
    const stop = await watch();
    latest().open();
    latest().sent = [];

    stop();

    expect(latest().sent.map((m) => (m as { op: number }).op)).toEqual([
      36, 36,
    ]);
    expect(latest().closed).toBe(true);
  });
});
