import { describe, expect, it, mock } from "bun:test";
import { flushSync } from "svelte";
import { Settings, persistInUrl, saveOnChange } from "./Settings.svelte";
import { defaultSettings } from "./ChatSettings";

describe("Settings", () => {
  it("starts from the defaults plus the given values", () => {
    const settings = new Settings({ fontSize: "large" });
    expect(settings.values).toEqual({ ...defaultSettings, fontSize: "large" });
  });

  it("resets everything but overlay mode", () => {
    const settings = new Settings({
      shadow: false,
      timestamps: true,
      overlay: true,
    });
    settings.reset();
    expect(settings.values).toEqual({ ...defaultSettings, overlay: true });
  });

  it("builds an overlay URL with the current settings", () => {
    const settings = new Settings({ fontSize: "huge" });
    expect(
      settings.overlayUrl(new URL("https://example.com/-/foo?size=large")),
    ).toBe("https://example.com/-/foo?size=huge&overlay=true");
  });
});

describe("persistInUrl", () => {
  function setup(initial: string) {
    let url = new URL(initial);
    const replace = mock((next: URL) => (url = next));
    const settings = new Settings();
    const stop = persistInUrl(settings, { current: () => url, replace });
    flushSync();
    return { settings, replace, stop, url: () => url.href };
  }

  it("does not touch a URL that already matches", () => {
    const { replace, stop } = setup("https://example.com/-/foo");
    expect(replace).not.toHaveBeenCalled();
    stop();
  });

  it("writes changed settings to the URL", () => {
    const { settings, replace, url, stop } = setup("https://example.com/-/foo");

    settings.values.timestamps = true;
    flushSync();
    expect(url()).toBe("https://example.com/-/foo?timestamps=true");

    settings.values.timestamps = false;
    flushSync();
    expect(url()).toBe("https://example.com/-/foo");
    expect(replace).toHaveBeenCalledTimes(2);
    stop();
  });

  it("stops when the returned function is called", () => {
    const { settings, replace, stop } = setup("https://example.com/-/foo");
    stop();

    settings.values.shadow = false;
    flushSync();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("saveOnChange", () => {
  function setup() {
    const settings = new Settings({ fontSize: "large" });
    const save = mock(() => {});
    const stop = saveOnChange(settings, save);
    flushSync();
    return { settings, save, stop };
  }

  it("does not save the initial settings", () => {
    const { save, stop } = setup();
    expect(save).not.toHaveBeenCalled();
    stop();
  });

  it("saves all settings once one changes", () => {
    const { settings, save, stop } = setup();

    settings.values.timestamps = true;
    flushSync();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenLastCalledWith({
      ...defaultSettings,
      fontSize: "large",
      timestamps: true,
    });

    settings.reset();
    flushSync();
    expect(save).toHaveBeenLastCalledWith(defaultSettings);
    stop();
  });

  it("stops when the returned function is called", () => {
    const { settings, save, stop } = setup();
    stop();

    settings.values.shadow = false;
    flushSync();
    expect(save).not.toHaveBeenCalled();
  });
});
