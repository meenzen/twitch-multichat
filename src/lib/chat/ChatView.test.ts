import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import ChatView from "./ChatView.svelte";
import { MessagePartType, MessageType } from "./ChatMessage";
import { createMessage } from "#lib/fake/fixtures.ts";

afterEach(cleanup);

describe("ChatView", () => {
  it("renders channel, user and text of each message", () => {
    render(ChatView, {
      messages: [
        createMessage({ channel: "foo", displayName: "Alice", text: "hello" }),
        createMessage({ channel: "bar", displayName: "Bob", text: "hi there" }),
      ],
    });

    expect(screen.getByText("[foo]")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("[bar]")).toBeTruthy();
    expect(screen.getByText("hi there")).toBeTruthy();
  });

  it("uses the user color and falls back to white", () => {
    render(ChatView, {
      messages: [
        createMessage({ displayName: "Colored", userColor: "#123456" }),
        createMessage({ displayName: "Plain", userColor: undefined }),
      ],
    });

    expect(screen.getByText("Colored").style.color).toBe("#123456");
    expect(screen.getByText("Plain").style.color).toBe("white");
  });

  it("renders emotes as images from the Twitch CDN", () => {
    render(ChatView, {
      messages: [
        createMessage({
          parts: [
            { type: MessagePartType.Text, content: "nice " },
            { type: MessagePartType.Emote, content: "25", emoteName: "Kappa" },
          ],
        }),
      ],
    });

    const emote = screen.getByAltText("Kappa") as HTMLImageElement;
    expect(emote.getAttribute("src")).toBe(
      "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/1.0",
    );
    // the service worker only caches CORS responses
    expect(emote.getAttribute("crossorigin")).toBe("anonymous");
  });

  it("renders third-party emotes from their URL unless hidden", async () => {
    const bttv = {
      type: MessagePartType.Emote,
      content: "k1",
      emoteName: "KKona",
      emoteUrl: "https://cdn.betterttv.net/emote/k1/1x.webp",
      emoteProvider: "bttv",
    };
    const view = render(ChatView, {
      messages: [createMessage({ parts: [bttv] })],
    });

    const emote = screen.getByAltText("KKona") as HTMLImageElement;
    expect(emote.getAttribute("src")).toBe(bttv.emoteUrl);
    // the BetterTTV CDN sends no CORS headers
    expect(emote.hasAttribute("crossorigin")).toBe(false);

    await view.rerender({ hiddenEmotes: ["bttv"] });

    expect(screen.queryByAltText("KKona")).toBeNull();
    expect(screen.getByText("KKona")).toBeTruthy();
  });

  it("renders links that open in a new tab", () => {
    render(ChatView, {
      messages: [
        createMessage({
          parts: [
            { type: MessagePartType.Text, content: "see " },
            {
              type: MessagePartType.Link,
              content: "twitch.tv/foo",
              href: "http://twitch.tv/foo",
            },
          ],
        }),
      ],
    });

    const link = screen.getByRole("link", { name: "twitch.tv/foo" });
    expect(link.getAttribute("href")).toBe("http://twitch.tv/foo");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("shows a divider where the chat was disconnected", () => {
    render(ChatView, {
      messages: [
        createMessage({ text: "before" }),
        { kind: "disconnect", id: "d1", since: 0, until: 133_000 },
        createMessage({ text: "after" }),
      ],
    });

    const marker = screen.getByRole("separator");
    expect(marker.textContent?.trim()).toBe("Disconnected for 2m 13s");
    expect(marker.previousElementSibling?.textContent).toContain("before");
    expect(marker.nextElementSibling?.textContent).toContain("after");
  });

  it("italicizes actions and omits the colon", () => {
    const { container } = render(ChatView, {
      messages: [createMessage({ type: MessageType.Action, text: "waves" })],
    });

    expect(screen.getByText("waves").closest(".italicized")).toBeTruthy();
    expect(container.textContent).not.toContain(":");
  });

  it("toggles the text shadow", () => {
    const messages = [createMessage({ displayName: "Alice" })];

    const { container, rerender } = render(ChatView, {
      messages,
      shadow: true,
    });
    expect(container.querySelector(".shadow")).toBeTruthy();

    rerender({ messages, shadow: false });
    expect(container.querySelector(".shadow")).toBeNull();
  });

  it("hides the channel name", () => {
    render(ChatView, {
      messages: [createMessage({ channel: "foo", text: "hello" })],
      channelTag: false,
    });
    expect(screen.queryByText("[foo]")).toBeNull();
    expect(screen.getByText("hello")).toBeTruthy();
  });

  it("shows timestamps only when asked to", () => {
    const sent = new Date(2026, 0, 1, 9, 5).getTime();
    const messages = [createMessage({ timestamp: sent })];

    const { rerender } = render(ChatView, { messages });
    expect(screen.queryByText("09:05")).toBeNull();

    rerender({ messages, timestamps: true });
    expect(screen.getByText("09:05")).toBeTruthy();
  });

  it("applies the text size", () => {
    render(ChatView, { messages: [], fontSize: 20 });
    expect(screen.getByTestId("chat-scroller").style.fontSize).toBe("20px");
  });

  it("updates when messages are removed", async () => {
    const keep = createMessage({ text: "stays" });
    const drop = createMessage({ text: "goes away" });
    const { rerender } = render(ChatView, { messages: [keep, drop] });
    expect(screen.queryByText("goes away")).toBeTruthy();

    await rerender({ messages: [keep] });

    expect(screen.queryByText("goes away")).toBeNull();
    expect(screen.getByText("stays")).toBeTruthy();
  });

  it("shows loading messages while connecting, joining and reconnecting", async () => {
    const { rerender } = render(ChatView, {
      messages: [],
      status: { kind: "connecting" },
    });
    expect(screen.getByText("Connecting to Twitch...")).toBeTruthy();

    await rerender({
      messages: [],
      status: { kind: "joining", channel: "foo" },
    });
    expect(screen.getByText("Joining: foo...")).toBeTruthy();

    await rerender({ messages: [], status: { kind: "reconnecting" } });
    expect(screen.getByText("Reconnecting...")).toBeTruthy();

    await rerender({ messages: [], status: { kind: "ready" } });
    expect(screen.queryByText(/Joining/)).toBeNull();
  });

  it("shows an error when the connection failed", () => {
    render(ChatView, {
      messages: [],
      status: { kind: "error", message: "offline" },
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "Failed to connect to twitch chat.",
    );
  });
});

describe("ChatView scrolling", () => {
  it("offers to jump back once the user scrolled up", async () => {
    render(ChatView, { messages: [createMessage({ text: "hello" })] });
    expect(screen.queryByText("More messages below")).toBeNull();

    await fireEvent.wheel(screen.getByTestId("chat-scroller"), {
      deltaY: -100,
    });
    const button = screen.getByText("More messages below");

    await fireEvent.click(button);
    expect(screen.queryByText("More messages below")).toBeNull();
  });
});
