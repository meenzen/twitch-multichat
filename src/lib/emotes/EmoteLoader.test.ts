import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import type { Emote, EmoteProvider } from "./Emote";
import { EmoteLoader } from "./EmoteLoader";

function emote(code: string, id = code): Emote {
  return { id, code, url: `https://cdn.example/${id}`, provider: "bttv" };
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

  it("retries global emotes that failed", async () => {
    let fail = true;
    const provider = fakeProvider(async () => {
      if (fail) throw new Error("down");
      return [emote("KKona")];
    });
    const loader = new EmoteLoader([provider]);

    expect((await loader.load("1")).size).toBe(0);
    fail = false;
    expect((await loader.load("2")).has("KKona")).toBe(true);
  });
});
