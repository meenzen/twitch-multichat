// SvelteKit registers the service worker, we only poll for updates. The worker
// itself calls skipWaiting() + clientsClaim(), so a found update activates
// without further interaction.

export const defaultIntervalMs = 10 * 60 * 1000;

type UpdateNavigator = {
  readonly onLine: boolean;
  readonly serviceWorker?: Pick<ServiceWorkerContainer, "ready">;
};

type UpdateRegistration = Pick<
  ServiceWorkerRegistration,
  "installing" | "update"
>;

export type WatchOptions = {
  intervalMs?: number;
  navigator?: UpdateNavigator;
};

/**
 * Ask the browser to check for a new service worker.
 * Returns whether a check was actually performed.
 */
export async function checkForUpdate(
  registration: UpdateRegistration,
  nav: UpdateNavigator,
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

/** Periodically check for service worker updates, returns a stop function */
export function watchForUpdates(options: WatchOptions = {}): () => void {
  const nav = options.navigator ?? globalThis.navigator;
  const intervalMs = options.intervalMs ?? defaultIntervalMs;

  if (!nav?.serviceWorker) return () => {};

  let stopped = false;
  let interval: ReturnType<typeof setInterval> | undefined;

  nav.serviceWorker.ready.then((registration) => {
    // stopped before the worker was ready, don't start polling anymore
    if (stopped) return;

    interval = setInterval(() => {
      void checkForUpdate(registration, nav);
    }, intervalMs);
  });

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}
