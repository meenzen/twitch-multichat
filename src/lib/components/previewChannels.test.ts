import { describe, expect, it } from "bun:test";
import { previewChannels } from "./previewChannels";

const names = (channels: ReturnType<typeof previewChannels>) =>
  channels.shown.map((channel) => channel.name);

describe("previewChannels", () => {
  it("shows a few short channels completely", () => {
    const channels = previewChannels(["a", "b", "c"]);
    expect(names(channels)).toEqual(["a", "b", "c"]);
    expect(channels.hidden).toBe(0);
  });

  it("shows the first channels that fit and counts the rest", () => {
    const all = Array.from({ length: 20 }, (_, i) => `channel${i}`);
    const channels = previewChannels(all);
    expect(names(channels)).toEqual(all.slice(0, 5));
    expect(channels.hidden).toBe(15);
  });

  it("always shows the first channel, however long", () => {
    const long = "a".repeat(25);
    expect(names(previewChannels([long, long]))).toEqual([long, long]);
    // with the "+2 more" tab, a second long name no longer fits
    const channels = previewChannels([long, long, long]);
    expect(names(channels)).toEqual([long]);
    expect(channels.hidden).toBe(2);
    expect(names(previewChannels([long + long, "b"]))[0]).toBe(long + long);
  });

  it("gives every shown channel its own colour", () => {
    const channels = previewChannels(["a", "b", "c", "d"]);
    const colors = channels.shown.map((channel) => channel.color);
    expect(new Set(colors).size).toBe(4);
  });
});
