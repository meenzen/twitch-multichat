import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import TwitchChannelList from "./TwitchChannelList.svelte";
import { ChannelFilter } from "#lib/chat/ChannelFilter.svelte.ts";

afterEach(cleanup);

function setup(channels = ["foo", "bar", "baz"]) {
  const filter = new ChannelFilter(channels);
  render(TwitchChannelList, { channels, filter });
  const button = (name: string) => screen.getByRole("button", { name });
  return { filter, button };
}

describe("TwitchChannelList", () => {
  it("shows every channel in its colour", () => {
    const { button } = setup();

    for (const name of ["foo", "bar", "baz"]) {
      expect(button(name).classList.contains("hidden")).toBe(false);
      expect(button(name).style.color).not.toBe("");
    }
  });

  it("grays out and strikes through channels hidden by a click", async () => {
    const { filter, button } = setup();

    await fireEvent.click(button("bar"));
    await tick();

    expect(filter.isShown("bar")).toBe(true);
    expect(filter.isShown("foo")).toBe(false);
    expect(button("bar").getAttribute("aria-pressed")).toBe("true");
    expect(button("foo").classList.contains("hidden")).toBe(true);
    expect(button("foo").style.color).toBe("");
    expect(button("foo").title).toBe("Show foo");
  });

  it("adds channels back and resets once nothing is left", async () => {
    const { filter, button } = setup();

    await fireEvent.click(button("bar"));
    await fireEvent.click(button("foo"));
    expect(filter.isShown("foo")).toBe(true);

    await fireEvent.click(button("foo"));
    await fireEvent.click(button("bar"));
    await tick();

    expect(filter.active).toBe(false);
    expect(button("foo").classList.contains("hidden")).toBe(false);
    expect(button("foo").title).toBe("Show only foo");
  });
});
