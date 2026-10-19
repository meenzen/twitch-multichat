import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/svelte";
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
