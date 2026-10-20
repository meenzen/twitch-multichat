import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import type { Emote, EmoteChange, EmoteProvider } from "./Emote";
import { EmoteLoader } from "./EmoteLoader";

function emote(code: string, id = code): Emote {
  return {
    id,
    code,
    images: [{ url: `https://cdn.example/${id}`, density: 1 }],
    provider: "bttv",
  };
}

function fakeProvider(
  global: () => Promise<Emote[]>,
  channel: (id: string) => Promise<Emote[]> = async () => [],
) {
  return {
    name: "bttv" as const,
    global: mock(global),
    channel: mock(channel),
  } satisfies EmoteProvider;
}

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("EmoteLoader", () => {
  it("combines global and channel emotes, the channel's win", async () => {
    const provider = fakeProvider(
      async () => [emote("KKona"), emote("Clap", "global-clap")],
      async () => [emote("Clap", "channel-clap")],
    );

    const emotes = await new EmoteLoader([provider]).load("123");

    expect(provider.channel).toHaveBeenCalledWith("123");
    expect([...emotes.keys()].sort()).toEqual(["Clap", "KKona"]);
    expect(emotes.get("Clap")?.id).toBe("channel-clap");
  });

  it("prefers any provider's channel emotes over global ones", async () => {
    const first = fakeProvider(
      async () => [emote("Clap", "first-global")],
      async () => [emote("Clap", "first-channel"), emote("D:", "first-d")],
    );
    const second = fakeProvider(
      async () => [emote("Clap", "second-global")],
      async () => [emote("D:", "second-d")],
    );

    const emotes = await new EmoteLoader([first, second]).load("1");

    expect(emotes.get("Clap")?.id).toBe("first-channel");
    // same level: the later provider wins
    expect(emotes.get("D:")?.id).toBe("second-d");
  });

  it("fetches global emotes once for all channels", async () => {
    const provider = fakeProvider(async () => [emote("KKona")]);
    const loader = new EmoteLoader([provider]);

    await loader.load("1");
    const emotes = await loader.load("2");

    expect(provider.global).toHaveBeenCalledTimes(1);
    expect(emotes.has("KKona")).toBe(true);
  });

  it("keeps global emotes when the channel fails", async () => {
    const provider = fakeProvider(
      async () => [emote("KKona")],
      async () => {
        throw new Error("down");
      },
    );

    const emotes = await new EmoteLoader([provider]).load("1");

    expect([...emotes.keys()]).toEqual(["KKona"]);
  });

  it("keeps a channel's emotes when a refresh fails", async () => {
    let down = false;
    const provider = fakeProvider(
      async () => [],
      async () => {
        if (down) throw new Error("down");
        return [emote("forsenE")];
      },
    );
    const loader = new EmoteLoader([provider]);

    expect((await loader.load("1")).has("forsenE")).toBe(true);
    down = true;
    expect((await loader.load("1")).has("forsenE")).toBe(true);
    // other channels don't get them
    expect((await loader.load("2")).has("forsenE")).toBe(false);
  });

  it("retries global emotes that failed", async () => {
    let fail = true;
    const provider = fakeProvider(async () => {
      if (fail) throw new Error("down");
      return [emote("KKona")];
    });
    const loader = new EmoteLoader([provider]);

    expect((await loader.load("1")).size).toBe(0);
    expect(provider.global).toHaveBeenCalledTimes(1);
    fail = false;
    expect((await loader.load("2")).has("KKona")).toBe(true);
  });
});

describe("EmoteLoader live changes", () => {
  /** A provider whose pushed changes the test sends */
  function liveProvider(channel: Emote[]) {
    const watchers = new Map<string, (change: EmoteChange) => void>();
    const stop = mock();
    const provider = {
      ...fakeProvider(
        async () => [emote("Global")],
        async () => channel,
      ),
      watch: mock((channelId: string, onChange: (c: EmoteChange) => void) => {
        watchers.set(channelId, onChange);
        return stop;
      }),
    } satisfies EmoteProvider;
    const push = (channelId: string, change: EmoteChange) =>
      watchers.get(channelId)?.(change);
    return { provider, push, stop };
  }

  /** Records the maps listeners get, as sorted codes */
  function record(loader: EmoteLoader) {
    const changes: [string, string[]][] = [];
    loader.onChange((channelId, emotes) =>
      changes.push([channelId, [...emotes.keys()].sort()]),
    );
    return changes;
  }

  it("watches each loaded channel once", async () => {
    const { provider } = liveProvider([]);
    const loader = new EmoteLoader([provider]);

    await loader.load("1");
    await loader.load("1");
    await loader.load("2");

    expect(provider.watch.mock.calls.map(([id]) => id)).toEqual(["1", "2"]);
  });

  it("applies added, renamed and removed emotes", async () => {
    const { provider, push } = liveProvider([emote("Old", "o")]);
    const loader = new EmoteLoader([provider]);
    const changes = record(loader);
    await loader.load("1");

    push("1", { kind: "add", emote: emote("New", "n") });
    await flush();
    push("1", { kind: "update", emote: emote("Renamed", "o") });
    await flush();
    push("1", { kind: "remove", id: "n" });
    await flush();

    expect(changes).toEqual([
      ["1", ["Global", "New", "Old"]],
      ["1", ["Global", "New", "Renamed"]],
      ["1", ["Global", "Renamed"]],
    ]);
  });

  it("describes each change for the console", async () => {
    const { provider, push } = liveProvider([emote("Old", "o")]);
    const loader = new EmoteLoader([provider]);
    const descriptions: string[] = [];
    loader.onChange((_id, _emotes, description) =>
      descriptions.push(description),
    );
    await loader.load("1");

    push("1", { kind: "add", emote: emote("New", "n") });
    await flush();
    push("1", { kind: "update", emote: emote("Renamed", "o") });
    await flush();
    push("1", { kind: "remove", id: "n" });
    await flush();
    push("1", { kind: "reload" });
    await flush();

    expect(descriptions).toEqual([
      'BetterTTV added "New"',
      'BetterTTV renamed "Old" to "Renamed"',
      'BetterTTV removed "New"',
      "BetterTTV reloaded the list (1 → 1 emotes)",
    ]);
  });

  it("fetches the channel again when asked to reload", async () => {
    let list = [emote("Before")];
    const { provider, push } = liveProvider([]);
    provider.channel.mockImplementation(async () => list);
    const loader = new EmoteLoader([provider]);
    const changes = record(loader);
    await loader.load("1");

    list = [emote("After")];
    push("1", { kind: "reload" });
    await flush();

    expect(changes).toEqual([["1", ["After", "Global"]]]);
  });

  it("stops watching when closed", async () => {
    const { provider, push, stop } = liveProvider([]);
    const loader = new EmoteLoader([provider]);
    const changes = record(loader);
    await loader.load("1");

    loader.close();
    push("1", { kind: "add", emote: emote("Late") });
    await flush();

    expect(stop).toHaveBeenCalled();
    expect(changes).toEqual([]);
  });
});

/** let pending promise callbacks run */
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => queueMicrotask(r));
};
