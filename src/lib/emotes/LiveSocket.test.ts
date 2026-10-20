import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import { LiveSocket } from "./LiveSocket";
import { fakeSockets } from "./fakeSocket";

function setup() {
  const { sockets, create, latest } = fakeSockets();
  const onOpen = mock();
  const onMessage = mock();
  const live = new LiveSocket({
    url: "wss://live.example",
    createSocket: create,
    onOpen,
    onMessage,
    silenceTimeoutMs: 60_000,
    minRetryMs: 1000,
    maxRetryMs: 4000,
  });
  return { live, sockets, latest, onOpen, onMessage };
}

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

describe("LiveSocket", () => {
  it("connects on start and passes messages on", () => {
    const { live, latest, onOpen, onMessage } = setup();

    live.start();
    latest().open();
    live.send({ hello: 1 });
    latest().receive({ a: 1 });

    expect(latest().url).toBe("wss://live.example");
    expect(onOpen).toHaveBeenCalledWith(false);
    expect(latest().sent).toEqual([{ hello: 1 }]);
    expect(onMessage).toHaveBeenCalledWith('{"a":1}');
  });

  it("does not send before the socket is open", () => {
    const { live, latest } = setup();

    live.start();
    live.send({ early: true });

    expect(latest().sent).toEqual([]);
  });

  it("reconnects with growing delays and says it is a reconnect", () => {
    const { live, sockets, latest, onOpen } = setup();
    live.start();
    latest().open();

    latest().drop();
    jest.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);

    // never opens: the delay doubles, up to the maximum
    latest().drop();
    jest.advanceTimersByTime(2000);
    expect(sockets).toHaveLength(3);
    latest().drop();
    jest.advanceTimersByTime(4000);
    expect(sockets).toHaveLength(4);
    latest().drop();
    jest.advanceTimersByTime(4000);
    expect(sockets).toHaveLength(5);

    latest().open();
    expect(onOpen).toHaveBeenLastCalledWith(true);
  });

  it("reconnects when the connection goes silent", () => {
    const { live, sockets, latest } = setup();
    live.start();
    latest().open();
    live.setSilenceTimeout(10_000);

    jest.advanceTimersByTime(9000);
    latest().receive({ heartbeat: true });
    jest.advanceTimersByTime(9000);
    expect(sockets).toHaveLength(1);

    jest.advanceTimersByTime(1000);
    expect(sockets[0].closed).toBe(true);
    jest.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
  });

  it("stays closed after stop", () => {
    const { live, sockets, latest } = setup();
    live.start();
    latest().open();

    live.stop();
    jest.advanceTimersByTime(120_000);

    expect(sockets).toHaveLength(1);
    expect(sockets[0].closed).toBe(true);
  });
});
