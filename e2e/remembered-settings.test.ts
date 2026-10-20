import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { join } from "node:path";
import { deploys, ensureDeploy } from "./deploys";

// Settings and channel selections are remembered on the device: a chat link
// without settings uses the saved ones, a link with settings shows exactly
// those without saving them, and the back arrow brings channels and settings
// to the landing page. Served like functions-limit.test.ts (static files,
// 404.html app shell for chat pages), which needs no Pages Function.

const deploy = "v1";

let server: ReturnType<typeof Bun.serve>;
let view: Bun.WebView;
let origin: string;

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

/** Opens a chat page and waits until it shows its channels */
async function openChat(path: string, channelCount: number) {
  await view.navigate(`${origin}${path}`);
  await waitFor(
    `document.querySelectorAll(".channel-list li").length === ${channelCount}`,
  );
}

function chatState() {
  return view.evaluate<{
    search: string;
    fontSize: string;
    back: string | null;
    saved: string | null;
  }>(`({
    search: location.search,
    fontSize: document.querySelector('[data-testid="chat-scroller"]').style.fontSize,
    back: document.querySelector('[aria-label="Back to channel selection"]').getAttribute("href"),
    saved: localStorage.getItem("settings"),
  })`);
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
  await view.navigate(`${origin}/`);
  await view.evaluate(`localStorage.clear()`);
}, 300_000);

afterAll(async () => {
  await view?.close();
  server?.stop(true);
});

describe("remembered settings", () => {
  it("saves settings changed in the menu", async () => {
    await openChat("/-/foo_bar", 1);
    expect(await chatState()).toEqual({
      search: "",
      fontSize: "13px",
      back: "/?channels=foo_bar",
      saved: null,
    });

    await view.evaluate(
      `document.querySelector('[aria-label="Settings"]').click()`,
    );
    await waitFor(`document.querySelector('input[value="large"]')`);
    await view.evaluate(
      `document.querySelector('input[value="large"]').click()`,
    );
    await waitFor(`localStorage.getItem("settings") === "size=large"`);
    await waitFor(`location.search === "?size=large"`);

    expect(await chatState()).toEqual({
      search: "?size=large",
      fontSize: "20px",
      back: "/?size=large&channels=foo_bar",
      saved: "size=large",
    });
  }, 30_000);

  it("applies the saved settings to links without settings", async () => {
    await openChat("/-/foo_bar/baz_qux", 2);
    await waitFor(`location.search === "?size=large"`);
    expect((await chatState()).fontSize).toBe("20px");
  }, 30_000);

  it("shows a link's own settings without saving them", async () => {
    await openChat("/-/foo_bar?timestamps=true", 1);
    expect(await chatState()).toEqual({
      search: "?timestamps=true",
      fontSize: "13px",
      back: "/?timestamps=true&channels=foo_bar",
      saved: "size=large",
    });
  }, 30_000);

  it("brings channels and settings back to the landing page", async () => {
    await view.navigate(`${origin}/?timestamps=true&channels=foo_bar,baz_qux`);
    await waitFor(`document.querySelector("textarea").value !== ""`);

    const landing = await view.evaluate<{
      channels: string;
      connect: string | null;
      recent: string[];
    }>(`({
      channels: document.querySelector("textarea").value,
      connect: [...document.querySelectorAll("a")].find((a) => a.textContent.trim() === "Connect")?.getAttribute("href"),
      recent: [...document.querySelectorAll(".recent li a")].map((a) => a.textContent.trim() + " " + a.getAttribute("href")),
    })`);
    expect(landing).toEqual({
      channels: "foo_bar\nbaz_qux",
      connect: "/-/foo_bar/baz_qux?timestamps=true",
      recent: [
        "foo_bar /-/foo_bar?timestamps=true",
        "foo_bar, baz_qux /-/foo_bar/baz_qux?timestamps=true",
      ],
    });
  }, 30_000);

  it("removes recent selections", async () => {
    await view.evaluate(
      `document.querySelector('[aria-label="Remove foo_bar from recent"]').click()`,
    );
    await waitFor(`document.querySelectorAll(".recent li").length === 1`);
    expect(
      JSON.parse(
        await view.evaluate<string>(`localStorage.getItem("recentChannels")`),
      ),
    ).toEqual([["foo_bar", "baz_qux"]]);
  }, 30_000);
});
