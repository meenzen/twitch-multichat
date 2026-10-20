import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { join } from "node:path";
import { deploys, ensureDeploy, versionOf } from "./deploys";

// End-to-end check of the service worker update flow: two real builds are
// served from the same origin, a headless Chrome (Bun.WebView) installs the
// first one, then we "deploy" the second and trigger the update check.
//
// Set E2E_REUSE_BUILD=1 to skip rebuilding when .e2e/v1 and .e2e/v2 exist.

const timings: Record<string, number> = {};

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    timings[label] = Math.round(performance.now() - start);
  }
}

let current = "v1";
let server: ReturnType<typeof Bun.serve>;
let view: Bun.WebView;
let origin: string;

/** Evaluate page code, failing instead of hanging forever */
function evaluate<T>(script: string, timeoutMs = 20_000): Promise<T> {
  return view.evaluate<T>(`Promise.race([
    (${script}),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ${timeoutMs})),
  ])`);
}

/**
 * Poll a page expression until it is truthy. Evaluations may fail while the
 * page reloads, those count as "not yet".
 */
async function waitFor(expression: string, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await evaluate<boolean>(`!!(${expression})`, 2_000).catch(
      () => false,
    );
    if (ok) return;
    await Bun.sleep(100);
  }
  throw new Error(`timed out waiting for: ${expression}`);
}

type PrecacheState = { cacheNames: string[]; urls: string[] };

function precacheState(): Promise<PrecacheState> {
  return evaluate<PrecacheState>(`(async () => {
    const cacheNames = await caches.keys();
    const name = cacheNames.find((n) => n.includes("precache"));
    const keys = name ? await (await caches.open(name)).keys() : [];
    return { cacheNames, urls: keys.map((r) => r.url) };
  })()`);
}

/** Revisions workbox stored for a file from static/, revisioned by app version */
function staticRevisions(state: PrecacheState): (string | null)[] {
  return state.urls
    .filter((u) => new URL(u).pathname === "/favicon-32x32.png")
    .map((u) => new URL(u).searchParams.get("__WB_REVISION__"));
}

beforeAll(async () => {
  await timed("build v1", () => ensureDeploy("v1"));
  await timed("build v2", () => ensureDeploy("v2"));

  server = Bun.serve({
    port: 0,
    async fetch(request) {
      const { pathname } = new URL(request.url);
      const path = pathname === "/" ? "/index.html" : pathname;
      const file = Bun.file(join(deploys, current, path));
      if (!(await file.exists())) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(file, { headers: { "cache-control": "no-cache" } });
    },
  });
  origin = `http://localhost:${server.port}`;

  await timed("start browser", async () => {
    const path = process.env.BUN_CHROME_PATH;
    view = new Bun.WebView({
      backend: path ? { type: "chrome", url: false, path } : "chrome",
    });
    await view.navigate("about:blank");
  });
}, 300_000);

afterAll(async () => {
  await view?.close();
  server?.stop(true);
  console.log("e2e timings (ms):", timings);
});

describe("service worker updates", () => {
  it("installs and takes control on first visit", async () => {
    await timed("first install", async () => {
      await view.navigate(`${origin}/`);
      // clientsClaim() makes the first worker control the open page
      await evaluate(`navigator.serviceWorker.controller
        ? true
        : new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", () => r(true), { once: true }))`);
    });

    const state = await precacheState();
    expect(state.urls.length).toBeGreaterThan(0);
    expect(staticRevisions(state)).toEqual([await versionOf("v1")]);
  });

  it("does not replace the worker when nothing was deployed", async () => {
    const installing = await timed("noop update check", () =>
      evaluate<boolean>(`(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration.update();
        return registration.installing !== null || registration.waiting !== null;
      })()`),
    );

    expect(installing).toBe(false);
    expect(
      await evaluate<boolean>(
        `document.body.textContent.includes("Installing update...")`,
      ),
    ).toBe(false);
  });

  it("shows a modal while installing a new deploy, then reloads", async () => {
    // sessionStorage survives the reload, the window marker does not
    await evaluate(`(() => {
      window.__e2eMarker = "old page";
      sessionStorage.removeItem("sawUpdateModal");
      new MutationObserver(() => {
        if (document.body.textContent.includes("Installing update...")) {
          sessionStorage.setItem("sawUpdateModal", "yes");
        }
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
      return true;
    })()`);
    current = "v2";

    await timed("update to v2 + reload", async () => {
      // same call the layout makes every 10 minutes; the reload tears down
      // this page, so don't wait for the update promise itself
      await evaluate(
        `(navigator.serviceWorker.getRegistration().then((r) => r.update()), true)`,
      );
      await waitFor(
        `window.__e2eMarker === undefined && document.readyState === "complete"`,
      );
      await waitFor(`navigator.serviceWorker.controller !== null`);
    });

    expect(
      await evaluate<string | null>(`sessionStorage.getItem("sawUpdateModal")`),
    ).toBe("yes");
    // the reloaded page no longer shows the modal
    expect(
      await evaluate<boolean>(
        `document.body.textContent.includes("Installing update...")`,
      ),
    ).toBe(false);

    const state = await precacheState();
    expect(staticRevisions(state)).toEqual([await versionOf("v2")]);
    expect(state.cacheNames.filter((n) => n.includes("precache"))).toHaveLength(
      1,
    );
  });
});
