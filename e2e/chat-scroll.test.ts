import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { join, resolve } from "node:path";
import { sveltePlugin } from "../test/sveltePlugin";

// Scroll behaviour of the chat in a real browser, with real layout and
// trusted input events. Bundles e2e/chat-scroll/harness.ts (the real chat
// layout fed by a FakeChatSource) and serves it inside src/app.html.

const root = resolve(import.meta.dir, "..");

let server: ReturnType<typeof Bun.serve>;
let view: Bun.WebView;
let origin: string;

type ScrollState = {
  scrollTop: number;
  /** px between the visible area and the end of the chat */
  distance: number;
  overflowing: boolean;
  /** whether the page itself scrolls, it should not */
  pageScrolls: boolean;
  jumpButton: boolean;
};

function scrollState(): Promise<ScrollState> {
  return view.evaluate<ScrollState>(`(() => {
    const s = document.querySelector('[data-testid="chat-scroller"]');
    const page = document.scrollingElement;
    return {
      scrollTop: s.scrollTop,
      distance: s.scrollHeight - s.clientHeight - s.scrollTop,
      overflowing: s.scrollHeight > s.clientHeight,
      pageScrolls: page.scrollHeight > page.clientHeight,
      jumpButton: document.querySelector(".jump-to-latest") !== null,
    };
  })()`);
}

/** Let the page render and fire pending scroll and resize events */
function settle(): Promise<unknown> {
  return view.evaluate(`new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50))))`);
}

async function expectAtBottom() {
  await settle();
  const state = await scrollState();
  expect(state.distance).toBeLessThanOrEqual(1);
  expect(state.jumpButton).toBe(false);
}

/**
 * Drag a finger down the screen, which scrolls up. Headless Chrome ignores
 * Input.synthesizeScrollGesture, raw touch events do scroll (with momentum).
 */
async function swipeDown(distance: number) {
  const x = 400;
  const touch = (type: string, y?: number) =>
    view.cdp("Input.dispatchTouchEvent", {
      type,
      touchPoints: y === undefined ? [] : [{ x, y }],
    });
  await touch("touchStart", 200);
  for (let y = 220; y <= 200 + distance; y += 20) {
    await touch("touchMove", y);
  }
  await touch("touchEnd");
}

async function openChat(prefill = 100) {
  await view.navigate(`${origin}/`);
  await view.evaluate(`window.chat.push(${prefill})`);
  await settle();
}

beforeAll(async () => {
  const build = await Bun.build({
    entrypoints: [join(import.meta.dir, "chat-scroll/harness.ts")],
    target: "browser",
    conditions: ["browser"],
    plugins: [sveltePlugin({ dev: false })],
  });
  if (!build.success) throw new AggregateError(build.logs, "build failed");
  const script = await build.outputs[0].text();

  // the real document shell, for the global styles and design tokens
  const html = (await Bun.file(join(root, "src/app.html")).text())
    .replace(
      "%sveltekit.head%",
      `<script type="module" src="/harness.js"></script>`,
    )
    .replace("%sveltekit.body%", `<div id="app"></div>`);

  server = Bun.serve({
    port: 0,
    fetch(request) {
      const { pathname } = new URL(request.url);
      if (pathname === "/") {
        return new Response(html, { headers: { "content-type": "text/html" } });
      }
      if (pathname === "/harness.js") {
        return new Response(script, {
          headers: { "content-type": "text/javascript" },
        });
      }
      return new Response("Not found", { status: 404 });
    },
  });
  origin = `http://localhost:${server.port}`;

  const path = process.env.BUN_CHROME_PATH;
  view = new Bun.WebView({
    backend: path ? { type: "chrome", url: false, path } : "chrome",
    width: 800,
    height: 600,
  });
}, 60_000);

afterAll(async () => {
  await view?.evaluate("window.chat?.stopStream()").catch(() => {});
  await view?.close();
  Bun.WebView.closeAll();
  server?.stop(true);
});

describe("chat scrolling", () => {
  it("shows the newest message on load and keeps up with new ones", async () => {
    await openChat();

    const state = await scrollState();
    expect(state.overflowing).toBe(true);
    expect(state.pageScrolls).toBe(false);
    await expectAtBottom();

    for (let i = 0; i < 5; i++) {
      await view.evaluate("window.chat.push(3)");
      await expectAtBottom();
    }
  });

  it("stays put after scrolling up with the mouse wheel", async () => {
    await openChat();
    await view.evaluate("window.chat.stream(20)");

    await view.scroll(0, -400);
    await Bun.sleep(300); // smooth scrolling
    const before = await scrollState();
    expect(before.distance).toBeGreaterThan(100);
    expect(before.jumpButton).toBe(true);

    await Bun.sleep(500);
    const after = await scrollState();
    expect(after.scrollTop).toBe(before.scrollTop);
    expect(after.distance).toBeGreaterThan(before.distance);

    await view.evaluate("window.chat.stopStream()");
  });

  it("jumps back to the newest message with the button", async () => {
    await openChat();
    await view.scroll(0, -400);
    await settle();
    await view.evaluate("window.chat.stream(20)");

    await view.click(".jump-to-latest");
    await expectAtBottom();

    await Bun.sleep(500);
    await expectAtBottom();
    await view.evaluate("window.chat.stopStream()");
  });

  it("resumes when scrolled back to the bottom by hand", async () => {
    await openChat();
    await view.scroll(0, -400);
    await Bun.sleep(300);
    expect((await scrollState()).jumpButton).toBe(true);

    await view.scroll(0, 2000);
    await Bun.sleep(300);
    await view.evaluate("window.chat.push(5)");
    await expectAtBottom();
  });

  it("stays put after swiping up on a touch screen", async () => {
    await view.cdp("Emulation.setTouchEmulationEnabled", { enabled: true });
    try {
      await openChat();
      await view.evaluate("window.chat.stream(20)");

      await swipeDown(200);
      await Bun.sleep(300); // momentum
      const before = await scrollState();
      expect(before.distance).toBeGreaterThan(100);
      expect(before.jumpButton).toBe(true);

      await Bun.sleep(500);
      const after = await scrollState();
      expect(after.scrollTop).toBe(before.scrollTop);
    } finally {
      await view.evaluate("window.chat.stopStream()");
      await view.cdp("Emulation.setTouchEmulationEnabled", { enabled: false });
    }
  });

  it("stays pinned when the window shrinks", async () => {
    await openChat();
    await view.resize(800, 300);
    try {
      await expectAtBottom();
    } finally {
      await view.resize(800, 600);
    }
  });
});
