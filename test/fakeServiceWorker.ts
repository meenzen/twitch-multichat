import { mock } from "bun:test";

// Minimal stand-ins for the service worker APIs, driven by the test.

export class FakeWorker extends EventTarget {
  state: ServiceWorkerState = "installing";

  setState(state: ServiceWorkerState): void {
    this.state = state;
    this.dispatchEvent(new Event("statechange"));
  }
}

export class FakeRegistration extends EventTarget {
  installing: ServiceWorker | null = null;
  update = mock(() =>
    Promise.resolve(this as unknown as ServiceWorkerRegistration),
  );

  /** The browser found a new worker and starts installing it */
  findUpdate(): FakeWorker {
    const worker = new FakeWorker();
    this.installing = worker as unknown as ServiceWorker;
    this.dispatchEvent(new Event("updatefound"));
    return worker;
  }
}

export class FakeContainer extends EventTarget {
  controller: object | null;
  readonly ready: Promise<FakeRegistration>;
  private resolveReady!: (registration: FakeRegistration) => void;

  constructor(
    readonly registration: FakeRegistration,
    controlled: boolean,
  ) {
    super();
    this.controller = controlled ? {} : null;
    this.ready = new Promise((resolve) => (this.resolveReady = resolve));
  }

  becomeReady(): void {
    this.resolveReady(this.registration);
  }

  /** A (new) worker took control of the page */
  takeControl(): void {
    this.controller = {};
    this.dispatchEvent(new Event("controllerchange"));
  }
}

export type FakeNavigator = {
  onLine: boolean;
  serviceWorker: ServiceWorkerContainer;
};

/**
 * @param controlled whether a worker already controls the page, i.e. this is
 *   a returning visit rather than the very first install
 */
export function fakeServiceWorker({ controlled = true } = {}) {
  const registration = new FakeRegistration();
  const container = new FakeContainer(registration, controlled);
  const navigator: FakeNavigator = {
    onLine: true,
    serviceWorker: container as unknown as ServiceWorkerContainer,
  };
  return { registration, container, navigator };
}

/** let pending promise callbacks run */
export const flush = () => new Promise<void>((r) => queueMicrotask(r));
