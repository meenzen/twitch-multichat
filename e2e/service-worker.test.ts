import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { cp, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

// End-to-end check of the service worker update flow: two real builds are
// served from the same origin, a headless Chrome (Bun.WebView) installs the
// first one, then we "deploy" the second and trigger the update check.
//
// Set E2E_REUSE_BUILD=1 to skip rebuilding when .e2e/v1 and .e2e/v2 exist.

const root = resolve(import.meta.dir, "..");
const deploys = join(root, ".e2e");
const timings: Record<string, number> = {};

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    timings[label] = Math.round(performance.now() - start);
  }
}

async function build(name: string) {
  const proc = Bun.spawn(["bun", "run", "build"], {
    cwd: root,
    stdout: "ignore",
    stderr: "inherit",
  });
  if ((await proc.exited) !== 0) throw new Error(`build ${name} failed`);
  await rm(join(deploys, name), { recursive: true, force: true });
  await cp(join(root, ".svelte-kit/cloudflare"), join(deploys, name), {
    recursive: true,
  });
}

async function versionOf(name: string): Promise<string> {
  const file = Bun.file(join(deploys, name, "_app/version.json"));
  return (await file.json()).version;
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

type PrecacheState = { cacheNames: string[]; urls: string[] };

function precacheState(): Promise<PrecacheState> {
  return evaluate<PrecacheState>(`(async () => {
    const cacheNames = await caches.keys();
    const name = cacheNames.find((n) => n.includes("precache"));
    const keys = name ? await (await caches.open(name)).keys() : [];
    return { cacheNames, urls: keys.map((r) => r.url) };
  })()`);
}

/** Revisions workbox stored for /emote.png, which is revisioned by app version */
function emoteRevisions(state: PrecacheState): (string | null)[] {
  return state.urls
    .filter((u) => new URL(u).pathname === "/emote.png")
    .map((u) => new URL(u).searchParams.get("__WB_REVISION__"));
}

beforeAll(async () => {
  await mkdir(deploys, { recursive: true });
  const reuse =
    process.env.E2E_REUSE_BUILD &&
    (await Bun.file(join(deploys, "v1/_app/version.json")).exists()) &&
    (await Bun.file(join(deploys, "v2/_app/version.json")).exists());

  if (!reuse) {
    await timed("build v1", () => build("v1"));
    await timed("build v2", () => build("v2"));
  }

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
  Bun.WebView.closeAll();
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
    expect(emoteRevisions(state)).toEqual([await versionOf("v1")]);
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
  });

  it("activates a new deploy without reloading the page", async () => {
    await evaluate(`(window.__e2eMarker = "same page", true)`);
    current = "v2";

    // same call the layout makes every 10 minutes
    await timed("update to v2", () =>
      evaluate(`(async () => {
        const changed = new Promise((r) =>
          navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
        const registration = await navigator.serviceWorker.getRegistration();
        await registration.update();
        await changed;
        // workbox drops stale precache entries while activating
        const worker = registration.active;
        if (worker.state !== "activated") {
          await new Promise((r) => worker.addEventListener("statechange", () =>
            worker.state === "activated" && r(), {}));
        }
        return true;
      })()`),
    );

    const state = await precacheState();
    expect(emoteRevisions(state)).toEqual([await versionOf("v2")]);
    expect(state.cacheNames.filter((n) => n.includes("precache"))).toHaveLength(
      1,
    );

    // skipWaiting + clientsClaim swap the worker, the page itself keeps running
    expect(await evaluate<string>("window.__e2eMarker")).toBe("same page");
  });
});
