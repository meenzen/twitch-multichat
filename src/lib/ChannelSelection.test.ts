import { describe, expect, it } from "bun:test";
import { readSelection, selectionHref } from "./ChannelSelection";
import { defaultSettings } from "./settings/ChatSettings";

describe("selectionHref", () => {
  it("is the plain home page without channels or settings", () => {
    expect(selectionHref("/", [], defaultSettings)).toBe("/");
  });

  it("carries the channels and changed settings", () => {
    expect(
      selectionHref("/", ["a1", "b1"], {
        ...defaultSettings,
        fontSize: "large",
      }),
    ).toBe("/?size=large&channels=a1%2Cb1");
  });

  it("leaves out overlay mode", () => {
    expect(
      selectionHref("/", ["a1"], { ...defaultSettings, overlay: true }),
    ).toBe("/?channels=a1");
  });
});

describe("readSelection", () => {
  const read = (query: string) => readSelection(new URLSearchParams(query));

  it("is empty without parameters", () => {
    expect(read("")).toEqual({ channels: [], settingsQuery: "" });
  });

  it("reads what selectionHref wrote", () => {
    const href = selectionHref("/", ["a1", "b1"], {
      ...defaultSettings,
      timestamps: true,
    });
    expect(read(href.slice(2))).toEqual({
      channels: ["a1", "b1"],
      settingsQuery: "timestamps=true",
    });
  });

  it("ignores invalid channels and settings", () => {
    expect(read("channels=a1,not%20valid&size=gigantic")).toEqual({
      channels: [],
      settingsQuery: "",
    });
  });
});
