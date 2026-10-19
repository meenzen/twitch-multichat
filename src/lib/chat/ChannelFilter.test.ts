import { describe, expect, it } from "bun:test";
import { ChannelFilter } from "./ChannelFilter.svelte";

const shownOf = (filter: ChannelFilter, channels: string[]) =>
  channels.filter((c) => filter.isShown(c));

describe("ChannelFilter", () => {
  const channels = ["a", "b", "c"];

  it("shows all channels at first", () => {
    const filter = new ChannelFilter(channels);

    expect(filter.active).toBe(false);
    expect(shownOf(filter, channels)).toEqual(channels);
  });

  it("shows only the first clicked channel", () => {
    const filter = new ChannelFilter(channels);

    filter.toggle("b");

    expect(filter.active).toBe(true);
    expect(shownOf(filter, channels)).toEqual(["b"]);
  });

  it("adds hidden channels and hides shown ones while filtered", () => {
    const filter = new ChannelFilter(channels);
    filter.toggle("b");

    filter.toggle("a");
    expect(shownOf(filter, channels)).toEqual(["a", "b"]);

    filter.toggle("b");
    expect(shownOf(filter, channels)).toEqual(["a"]);
  });

  it("shows everything again after hiding the last shown channel", () => {
    const filter = new ChannelFilter(channels);
    filter.toggle("b");

    filter.toggle("b");

    expect(filter.active).toBe(false);
    expect(shownOf(filter, channels)).toEqual(channels);
  });

  it("stops filtering once every channel was added back", () => {
    const filter = new ChannelFilter(channels);
    filter.toggle("a");
    filter.toggle("b");
    filter.toggle("c");

    expect(filter.active).toBe(false);
    // the next click starts over with a single channel
    filter.toggle("c");
    expect(shownOf(filter, channels)).toEqual(["c"]);
  });

  it("compares channel names case-insensitively", () => {
    const filter = new ChannelFilter(["SomeChannel", "other"]);

    filter.toggle("SomeChannel");

    expect(filter.isShown("somechannel")).toBe(true);
    expect(filter.isShown("#SOMECHANNEL")).toBe(true);
    expect(filter.isShown("other")).toBe(false);
  });

  it("resets with showAll", () => {
    const filter = new ChannelFilter(channels);
    filter.toggle("a");

    filter.showAll();

    expect(filter.active).toBe(false);
  });
});
