import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import Chat from "./Chat.svelte";
import { FakeChatSource } from "#lib/fake/FakeChatSource.ts";
import { createMessage } from "#lib/fake/fixtures.ts";

afterEach(cleanup);

describe("Chat", () => {
  it("connects the source to the given channels", () => {
    const source = new FakeChatSource();

    render(Chat, { source, channels: ["foo", "bar"] });

    expect(source.connectedChannels).toEqual(["foo", "bar"]);
  });

  it("renders incoming messages and applies moderation", async () => {
    const source = new FakeChatSource();
    render(Chat, { source, channels: ["foo"] });

    const spam = createMessage({
      channel: "foo",
      userName: "troll",
      text: "spam",
    });
    source.push(
      createMessage({ channel: "foo", text: "first" }),
      spam,
      createMessage({ channel: "foo", text: "second" }),
    );
    await tick();
    expect(screen.getByText("spam")).toBeTruthy();

    source.clearUser("foo", "troll");
    await tick();
    expect(screen.queryByText("spam")).toBeNull();
    expect(screen.getByText("first")).toBeTruthy();

    source.clearChannel("foo");
    await tick();
    expect(screen.queryByText("first")).toBeNull();
    expect(screen.queryByText("second")).toBeNull();
  });

  it("shows status updates from the source", async () => {
    const source = new FakeChatSource();
    render(Chat, { source, channels: [] });

    source.setStatus({ kind: "joining", channel: "foo" });
    await tick();

    expect(screen.getByText("Joining: foo...")).toBeTruthy();
  });

  it("disconnects when unmounted", () => {
    const source = new FakeChatSource();
    const { unmount } = render(Chat, { source, channels: ["foo"] });

    unmount();

    expect(source.disconnected).toBe(true);
  });
});
