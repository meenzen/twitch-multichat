import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { join } from "node:path";
import { deploys, ensureDeploy } from "./deploys";

// What visitors get once the Cloudflare Functions limit is used up. Pages
// then "fails open": requests skip the Function and only static assets are
// served, as if there was no _worker.js. Chat pages only exist as Function
// responses, so they get the top-level 404.html, which must be the app shell
// (adapter `fallback: "spa"`) for the chat to still work.

const deploy = "v1";

let server: ReturnType<typeof Bun.serve>;
let view: Bun.WebView;
let origin: string;

/** Cloudflare Pages' static asset lookup, without Functions */
async function pagesStatic(pathname: string): Promise<Response> {
  const dir = join(deploys, deploy);
  const candidates = pathname.endsWith("/")
    ? [`${pathname}index.html`]
    : [pathname, `${pathname}.html`, `${pathname}/index.html`];
  for (const candidate of candidates) {
    const file = Bun.file(join(dir, candidate));
    if (await file.exists()) return new Response(file);
  }
  return new Response(Bun.file(join(dir, "404.html")), {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/** Poll a page expression until it is truthy */
async function waitFor(expression: string, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await view
      .evaluate<boolean>(`!!(${expression})`)
      .catch(() => false);
    if (ok) return;
    await Bun.sleep(100);
  }
  throw new Error(`timed out waiting for: ${expression}`);
}

beforeAll(async () => {
  await ensureDeploy(deploy);

  server = Bun.serve({
    port: 0,
    fetch: (request) =>
      pagesStatic(decodeURIComponent(new URL(request.url).pathname)),
  });
  origin = `http://localhost:${server.port}`;

  const path = process.env.BUN_CHROME_PATH;
  view = new Bun.WebView({
    backend: path ? { type: "chrome", url: false, path } : "chrome",
  });
  await view.navigate("about:blank");
}, 300_000);

afterAll(async () => {
  await view?.close();
  Bun.WebView.closeAll();
  server?.stop(true);
});

describe("after the Functions limit (fail open)", () => {
  it("serves the landing page as a static file", async () => {
    const response = await fetch(`${origin}/`);
    expect(response.status).toBe(200);
  });

  it("still runs the chat from the 404.html app shell", async () => {
    const url = `${origin}/-/foo/bar?size=large`;
    expect((await fetch(url)).status).toBe(404);

    await view.navigate(url);
    await waitFor(`document.querySelectorAll(".channel-list li").length === 2`);

    const page = await view.evaluate<{
      channels: string[];
      fontSize: string;
      settings: boolean;
    }>(`({
      channels: [...document.querySelectorAll(".channel-list li")].map((li) => li.textContent.trim()),
      fontSize: document.querySelector('[data-testid="chat-scroller"]').style.fontSize,
      settings: document.querySelector('[aria-label="Settings"]') !== null,
    })`);
    expect(page).toEqual({
      channels: ["foo", "bar"],
      fontSize: "20px",
      settings: true,
    });
  }, 30_000);
});
