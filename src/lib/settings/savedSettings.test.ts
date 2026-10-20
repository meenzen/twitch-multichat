import { describe, expect, it } from "bun:test";
import { brokenStorage, fakeStorage } from "../../../test/fakeStorage";
import { defaultSettings } from "./ChatSettings";
import { initialSettings, loadSettings, saveSettings } from "./savedSettings";

describe("saved settings", () => {
  it("are the defaults when nothing is saved", () => {
    expect(loadSettings(fakeStorage())).toEqual(defaultSettings);
    expect(loadSettings(undefined)).toEqual(defaultSettings);
  });

  it("round-trip through the storage", () => {
    const storage = fakeStorage();
    const settings = { ...defaultSettings, fontSize: "huge" as const };
    saveSettings(storage, settings);
    expect(storage.items.get("settings")).toBe("size=huge");
    expect(loadSettings(storage)).toEqual(settings);
  });

  it("never include overlay mode", () => {
    const storage = fakeStorage();
    saveSettings(storage, { ...defaultSettings, overlay: true });
    expect(storage.items.get("settings")).toBe("");

    storage.items.set("settings", "overlay=true&timestamps=true");
    expect(loadSettings(storage)).toEqual({
      ...defaultSettings,
      timestamps: true,
    });
  });

  it("drop invalid values", () => {
    const storage = fakeStorage({ settings: "size=gigantic&shadow=false" });
    expect(loadSettings(storage)).toEqual({
      ...defaultSettings,
      shadow: false,
    });
  });

  it("survive a storage that throws", () => {
    expect(() =>
      saveSettings(brokenStorage, { ...defaultSettings, shadow: false }),
    ).not.toThrow();
    expect(loadSettings(brokenStorage)).toEqual(defaultSettings);
  });
});

describe("initialSettings", () => {
  const storage = fakeStorage({ settings: "size=large&timestamps=true" });

  it("uses the saved settings for a link without settings", () => {
    expect(initialSettings(new URLSearchParams(""), storage)).toEqual({
      ...defaultSettings,
      fontSize: "large",
      timestamps: true,
    });
  });

  it("shows exactly the link's settings when it has any", () => {
    expect(
      initialSettings(new URLSearchParams("shadow=false"), storage),
    ).toEqual({ ...defaultSettings, shadow: false });
  });

  it("treats an overlay link as a link with settings", () => {
    expect(
      initialSettings(new URLSearchParams("overlay=true"), storage),
    ).toEqual({ ...defaultSettings, overlay: true });
  });
});
