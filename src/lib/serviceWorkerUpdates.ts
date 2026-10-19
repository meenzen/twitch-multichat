// SvelteKit registers the service worker; here we poll for updates and react
// to them. The worker calls skipWaiting() + clientsClaim(), so a new version
// installs and takes control on its own. We then reload the page, otherwise it
// would keep running the old code until the next navigation.

export const defaultIntervalMs = 10 * 60 * 1000;

type UpdateContainer = Pick<
  ServiceWorkerContainer,
  "ready" | "controller" | "addEventListener" | "removeEventListener"
>;

type UpdateNavigator = {
  readonly onLine: boolean;
  readonly serviceWorker?: UpdateContainer;
};

type UpdateRegistration = Pick<
  ServiceWorkerRegistration,
  "installing" | "update" | "addEventListener" | "removeEventListener"
>;

export type WatchOptions = {
  intervalMs?: number;
  navigator?: UpdateNavigator;
  /** A new version was found and is being installed */
  onUpdateFound?: () => void;
  /** Installing the new version failed, the current one stays active */
  onUpdateFailed?: () => void;
  /** Called once the new version controls the page */
  reload?: () => void;
};

/**
 * Ask the browser to check for a new service worker.
 * Returns whether a check was actually performed.
 */
export async function checkForUpdate(
  registration: Pick<UpdateRegistration, "installing" | "update">,
  nav: Pick<UpdateNavigator, "onLine">,
): Promise<boolean> {
  // an update is already being installed
  if (registration.installing) return false;

  if (!nav.onLine) return false;

  console.log("Checking for sw update");

  try {
    await registration.update();
  } catch (error) {
    // flaky networks are expected, try again on the next tick
    console.warn("Service worker update check failed:", error);
    return false;
  }

  return true;
}

/**
 * Periodically check for service worker updates and reload the page once a
 * new version took over. Returns a stop function.
 */
export function watchForUpdates(options: WatchOptions = {}): () => void {
  const nav = options.navigator ?? globalThis.navigator;
  const intervalMs = options.intervalMs ?? defaultIntervalMs;
  const reload = options.reload ?? (() => location.reload());
  const container = nav?.serviceWorker;

  if (!container) return () => {};

  let stopped = false;
  let reloading = false;
  let interval: ReturnType<typeof setInterval> | undefined;
  let registration: UpdateRegistration | undefined;
  const cleanups: (() => void)[] = [];

  // Without a controller this is the first install: clientsClaim() will fire
  // controllerchange, but there is no old version to replace.
  let hasController = container.controller !== null;

  function onControllerChange() {
    if (!hasController) {
      hasController = true;
      return;
    }
    if (reloading) return;
    reloading = true;
    console.log("New service worker took control, reloading");
    reload();
  }

  function trackInstall(worker: ServiceWorker | null) {
    if (!worker || !hasController) return;

    console.log("Service worker update found, installing");
    options.onUpdateFound?.();

    const onStateChange = () => {
      if (worker.state === "redundant") {
        console.warn("Service worker update failed to install");
        worker.removeEventListener("statechange", onStateChange);
        options.onUpdateFailed?.();
      }
    };
    worker.addEventListener("statechange", onStateChange);
    cleanups.push(() =>
      worker.removeEventListener("statechange", onStateChange),
    );
  }

  function onUpdateFound() {
    trackInstall(registration?.installing ?? null);
  }

  container.addEventListener("controllerchange", onControllerChange);

  container.ready.then((ready) => {
    // stopped before the worker was ready, don't start anything anymore
    if (stopped) return;

    registration = ready;
    registration.addEventListener("updatefound", onUpdateFound);
    // an update may already be underway, e.g. found during page load
    trackInstall(registration.installing);

    interval = setInterval(() => {
      void checkForUpdate(ready, nav);
    }, intervalMs);
  });

  return () => {
    stopped = true;
    clearInterval(interval);
    container.removeEventListener("controllerchange", onControllerChange);
    registration?.removeEventListener("updatefound", onUpdateFound);
    cleanups.forEach((cleanup) => cleanup());
  };
}
