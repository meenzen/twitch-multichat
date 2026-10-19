import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import {
  checkForUpdate,
  defaultIntervalMs,
  watchForUpdates,
} from "./serviceWorkerUpdates";

function fakeRegistration() {
  return {
    installing: null as ServiceWorker | null,
    update: mock(() => Promise.resolve({} as ServiceWorkerRegistration)),
  };
}

type Registration = ReturnType<typeof fakeRegistration>;

/** navigator whose serviceWorker.ready resolves when the test decides */
function fakeNavigator(registration: Registration) {
  let resolveReady!: (r: Registration) => void;
  const ready = new Promise<Registration>((r) => (resolveReady = r));
  const nav = {
    onLine: true,
    serviceWorker: { ready } as unknown as ServiceWorkerContainer,
  };
  return { nav, becomeReady: () => resolveReady(registration) };
}

/** let pending promise callbacks run */
const flush = () => new Promise<void>((r) => queueMicrotask(r));

beforeEach(() => {
  jest.useFakeTimers();
  // keep the test output clean
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("checkForUpdate", () => {
  it("asks the registration for an update", async () => {
    const registration = fakeRegistration();

    const checked = await checkForUpdate(registration, { onLine: true });

    expect(checked).toBe(true);
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("skips while an update is already installing", async () => {
    const registration = fakeRegistration();
    registration.installing = {} as ServiceWorker;

    expect(await checkForUpdate(registration, { onLine: true })).toBe(false);
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("skips while offline", async () => {
    const registration = fakeRegistration();

    expect(await checkForUpdate(registration, { onLine: false })).toBe(false);
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("swallows failed update checks", async () => {
    const registration = fakeRegistration();
    registration.update.mockImplementation(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    );

    expect(await checkForUpdate(registration, { onLine: true })).toBe(false);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe("watchForUpdates", () => {
  it("polls once per interval after the worker is ready", async () => {
    const registration = fakeRegistration();
    const { nav, becomeReady } = fakeNavigator(registration);

    watchForUpdates({ navigator: nav, intervalMs: 1000 });
    jest.advanceTimersByTime(5000);
    expect(registration.update).not.toHaveBeenCalled();

    becomeReady();
    await flush();
    jest.advanceTimersByTime(999);
    expect(registration.update).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(registration.update).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(3000);
    expect(registration.update).toHaveBeenCalledTimes(4);
  });

  it("checks every 10 minutes by default", async () => {
    const registration = fakeRegistration();
    const { nav, becomeReady } = fakeNavigator(registration);

    watchForUpdates({ navigator: nav });
    becomeReady();
    await flush();
    jest.advanceTimersByTime(defaultIntervalMs * 3);

    expect(defaultIntervalMs).toBe(10 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledTimes(3);
  });

  it("only checks while online", async () => {
    const registration = fakeRegistration();
    const { nav, becomeReady } = fakeNavigator(registration);

    watchForUpdates({ navigator: nav, intervalMs: 1000 });
    becomeReady();
    await flush();

    nav.onLine = false;
    jest.advanceTimersByTime(3000);
    expect(registration.update).not.toHaveBeenCalled();

    nav.onLine = true;
    jest.advanceTimersByTime(1000);
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("stops polling when stopped", async () => {
    const registration = fakeRegistration();
    const { nav, becomeReady } = fakeNavigator(registration);

    const stop = watchForUpdates({ navigator: nav, intervalMs: 1000 });
    becomeReady();
    await flush();
    jest.advanceTimersByTime(1000);

    stop();
    jest.advanceTimersByTime(10_000);

    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("never starts polling when stopped before the worker is ready", async () => {
    const registration = fakeRegistration();
    const { nav, becomeReady } = fakeNavigator(registration);

    const stop = watchForUpdates({ navigator: nav, intervalMs: 1000 });
    stop();
    becomeReady();
    await flush();
    jest.advanceTimersByTime(10_000);

    expect(registration.update).not.toHaveBeenCalled();
  });

  it("does nothing without service worker support", () => {
    const stop = watchForUpdates({ navigator: { onLine: true } });

    expect(() => stop()).not.toThrow();
  });
});
