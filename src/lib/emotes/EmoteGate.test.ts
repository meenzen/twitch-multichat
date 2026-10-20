import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import type { Emote, EmoteMap } from "./Emote";
import { EmoteGate } from "./EmoteGate";

function emotes(...codes: string[]): EmoteMap {
  return new Map(
    codes.map((code): [string, Emote] => [
      code,
      { id: code, code, url: "", provider: "bttv" },
    ]),
  );
}

/** A loader whose requests are answered by the test */
function manualLoader() {
  const pending: {
    channelId: string;
    resolve: (emotes: EmoteMap) => void;
    reject: (error: Error) => void;
  }[] = [];
  const load = mock(
    (channelId: string) =>
      new Promise<EmoteMap>((resolve, reject) =>
        pending.push({ channelId, resolve, reject }),
      ),
  );
  return { load, pending };
}

/** let pending promise callbacks run */
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => queueMicrotask(r));
};

/** Records which events ran and with which emotes */
function recorder() {
  const ran: string[] = [];
  const event = (name: string) => (emotes: EmoteMap) =>
    ran.push(`${name}:${[...emotes.keys()].join(",")}`);
  return { ran, event };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("EmoteGate", () => {
  it("runs events right away for channels it does not know", () => {
    const { load } = manualLoader();
    const gate = new EmoteGate(load);
    const { ran, event } = recorder();

    gate.run("chan", event("a"));

    expect(ran).toEqual(["a:"]);
  });

  it("holds a channel's events until its emotes are loaded", async () => {
    const { load, pending } = manualLoader();
    const gate = new EmoteGate(load);
    const { ran, event } = recorder();

    gate.load("chan", "123");
    gate.run("chan", event("message"));
    gate.run("chan", event("removal"));
    gate.run("other", event("elsewhere"));

    expect(load).toHaveBeenCalledWith("123");
    expect(ran).toEqual(["elsewhere:"]);

    pending[0].resolve(emotes("KKona"));
    await flush();

    expect(ran).toEqual(["elsewhere:", "message:KKona", "removal:KKona"]);

    gate.run("chan", event("later"));
    expect(ran.at(-1)).toBe("later:KKona");
  });

  it("loads a channel only once when asked to ensure it", () => {
    const { load } = manualLoader();
    const gate = new EmoteGate(load);

    gate.ensure("chan", "123");
    gate.ensure("chan", "123");

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("lets events through without emotes after the timeout", async () => {
    const { load, pending } = manualLoader();
    const gate = new EmoteGate(load, 3000);
    const { ran, event } = recorder();

    gate.load("chan", "123");
    gate.run("chan", event("early"));

    jest.advanceTimersByTime(2999);
    await flush();
    expect(ran).toEqual([]);

    jest.advanceTimersByTime(1);
    await flush();
    expect(ran).toEqual(["early:"]);

    // the late list is still used for new messages
    pending[0].resolve(emotes("KKona"));
    await flush();
    gate.run("chan", event("late"));
    expect(ran).toEqual(["early:", "late:KKona"]);
  });

  it("lets events through when loading fails", async () => {
    const { load, pending } = manualLoader();
    const gate = new EmoteGate(load);
    const { ran, event } = recorder();

    gate.load("chan", "123");
    gate.run("chan", event("a"));
    pending[0].reject(new Error("down"));
    await flush();

    expect(ran).toEqual(["a:"]);
  });

  it("refreshes in the background without holding events", async () => {
    const { load, pending } = manualLoader();
    const gate = new EmoteGate(load);
    const { ran, event } = recorder();

    gate.load("chan", "123");
    pending[0].resolve(emotes("old"));
    await flush();

    gate.load("chan", "123");
    gate.run("chan", event("during"));
    pending[1].resolve(emotes("new"));
    await flush();
    gate.run("chan", event("after"));

    expect(ran).toEqual(["during:old", "after:new"]);
  });
});
