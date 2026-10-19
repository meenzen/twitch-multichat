import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import { fakeServiceWorker, flush } from "../../test/fakeServiceWorker";
import {
  checkForUpdate,
  defaultIntervalMs,
  watchForUpdates,
  type WatchOptions,
} from "./serviceWorkerUpdates";

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

/** start watching with spies for every callback */
function watch(
  sw: ReturnType<typeof fakeServiceWorker>,
  options: WatchOptions = {},
) {
  const callbacks = {
    onUpdateFound: mock(),
    onUpdateFailed: mock(),
    reload: mock(),
  };
  const stop = watchForUpdates({
    navigator: sw.navigator,
    intervalMs: 1000,
    ...callbacks,
    ...options,
  });
  return { ...callbacks, stop };
}

describe("checkForUpdate", () => {
  it("asks the registration for an update", async () => {
    const { registration } = fakeServiceWorker();

    const checked = await checkForUpdate(registration, { onLine: true });

    expect(checked).toBe(true);
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("skips while an update is already installing", async () => {
    const { registration } = fakeServiceWorker();
    registration.findUpdate();

    expect(await checkForUpdate(registration, { onLine: true })).toBe(false);
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("skips while offline", async () => {
    const { registration } = fakeServiceWorker();

    expect(await checkForUpdate(registration, { onLine: false })).toBe(false);
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("swallows failed update checks", async () => {
    const { registration } = fakeServiceWorker();
    registration.update.mockImplementation(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    );

    expect(await checkForUpdate(registration, { onLine: true })).toBe(false);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe("watchForUpdates polling", () => {
  it("polls once per interval after the worker is ready", async () => {
    const sw = fakeServiceWorker();

    watch(sw);
    jest.advanceTimersByTime(5000);
    expect(sw.registration.update).not.toHaveBeenCalled();

    sw.container.becomeReady();
    await flush();
    jest.advanceTimersByTime(999);
    expect(sw.registration.update).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(sw.registration.update).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(3000);
    expect(sw.registration.update).toHaveBeenCalledTimes(4);
  });

  it("checks every 10 minutes by default", async () => {
    const sw = fakeServiceWorker();

    watchForUpdates({ navigator: sw.navigator });
    sw.container.becomeReady();
    await flush();
    jest.advanceTimersByTime(defaultIntervalMs * 3);

    expect(defaultIntervalMs).toBe(10 * 60 * 1000);
    expect(sw.registration.update).toHaveBeenCalledTimes(3);
  });

  it("only checks while online", async () => {
    const sw = fakeServiceWorker();

    watch(sw);
    sw.container.becomeReady();
    await flush();

    sw.navigator.onLine = false;
    jest.advanceTimersByTime(3000);
    expect(sw.registration.update).not.toHaveBeenCalled();

    sw.navigator.onLine = true;
    jest.advanceTimersByTime(1000);
    expect(sw.registration.update).toHaveBeenCalledTimes(1);
  });

  it("stops polling when stopped", async () => {
    const sw = fakeServiceWorker();

    const { stop } = watch(sw);
    sw.container.becomeReady();
    await flush();
    jest.advanceTimersByTime(1000);

    stop();
    jest.advanceTimersByTime(10_000);

    expect(sw.registration.update).toHaveBeenCalledTimes(1);
  });

  it("never starts polling when stopped before the worker is ready", async () => {
    const sw = fakeServiceWorker();

    const { stop } = watch(sw);
    stop();
    sw.container.becomeReady();
    await flush();
    jest.advanceTimersByTime(10_000);

    expect(sw.registration.update).not.toHaveBeenCalled();
  });

  it("does nothing without service worker support", () => {
    const stop = watchForUpdates({ navigator: { onLine: true } });

    expect(() => stop()).not.toThrow();
  });
});

describe("watchForUpdates reloading", () => {
  it("announces a found update and reloads once it took control", async () => {
    const sw = fakeServiceWorker();
    const { onUpdateFound, reload } = watch(sw);
    sw.container.becomeReady();
    await flush();

    const worker = sw.registration.findUpdate();
    expect(onUpdateFound).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();

    worker.setState("installed");
    worker.setState("activating");
    sw.container.takeControl();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads only once", async () => {
    const sw = fakeServiceWorker();
    const { reload } = watch(sw);

    sw.container.takeControl();
    sw.container.takeControl();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload or announce anything on the first install", async () => {
    const sw = fakeServiceWorker({ controlled: false });
    const { onUpdateFound, reload } = watch(sw);
    sw.container.becomeReady();
    await flush();

    // first worker installs and claims the page
    sw.registration.findUpdate();
    sw.container.takeControl();

    expect(onUpdateFound).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads for updates after the first install", async () => {
    const sw = fakeServiceWorker({ controlled: false });
    const { onUpdateFound, reload } = watch(sw);
    sw.container.becomeReady();
    await flush();
    sw.container.takeControl();

    sw.registration.findUpdate();
    sw.container.takeControl();

    expect(onUpdateFound).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("picks up an update that was already installing when ready", async () => {
    const sw = fakeServiceWorker();
    sw.registration.findUpdate();
    const { onUpdateFound } = watch(sw);

    sw.container.becomeReady();
    await flush();

    expect(onUpdateFound).toHaveBeenCalledTimes(1);
  });

  it("reports a failed install", async () => {
    const sw = fakeServiceWorker();
    const { onUpdateFailed, reload } = watch(sw);
    sw.container.becomeReady();
    await flush();

    const worker = sw.registration.findUpdate();
    worker.setState("redundant");

    expect(onUpdateFailed).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it("ignores events after being stopped", async () => {
    const sw = fakeServiceWorker();
    const { onUpdateFound, onUpdateFailed, reload, stop } = watch(sw);
    sw.container.becomeReady();
    await flush();
    const worker = sw.registration.findUpdate();

    stop();
    worker.setState("redundant");
    sw.registration.findUpdate();
    sw.container.takeControl();

    expect(onUpdateFound).toHaveBeenCalledTimes(1);
    expect(onUpdateFailed).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
