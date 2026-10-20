import { describe, expect, it } from "bun:test";
import {
  defaultSettings,
  hiddenEmoteProviders,
  parseSettings,
  settingsUrl,
} from "./ChatSettings";

const parse = (query: string) => parseSettings(new URLSearchParams(query));

describe("parseSettings", () => {
  it("uses the defaults without parameters", () => {
    expect(parse("")).toEqual(defaultSettings);
  });

  it("reads every setting", () => {
    expect(
      parse(
        "shadow=false&size=large&channel=false&timestamps=true&bttv=false&overlay=true",
      ),
    ).toEqual({
      shadow: false,
      fontSize: "large",
      channelTag: false,
      timestamps: true,
      bttv: false,
      overlay: true,
    });
  });

  it("falls back to the default for invalid values", () => {
    expect(parse("shadow=nope&size=gigantic&timestamps=1")).toEqual(
      defaultSettings,
    );
  });
});

describe("hiddenEmoteProviders", () => {
  it("hides BetterTTV emotes when turned off", () => {
    expect(hiddenEmoteProviders(defaultSettings)).toEqual([]);
    expect(hiddenEmoteProviders({ bttv: false })).toEqual(["bttv"]);
  });
});

describe("settingsUrl", () => {
  const base = new URL("https://example.com/-/foo/bar");

  it("leaves out settings that have their default value", () => {
    expect(settingsUrl(base, { ...defaultSettings }).href).toBe(base.href);
  });

  it("adds settings that differ from the default", () => {
    const url = settingsUrl(base, {
      ...defaultSettings,
      fontSize: "huge",
      timestamps: true,
    });
    expect(url.search).toBe("?size=huge&timestamps=true");
  });

  it("removes parameters that went back to the default", () => {
    const url = settingsUrl(new URL(`${base.href}?shadow=false&size=large`), {
      ...defaultSettings,
      fontSize: "large",
    });
    expect(url.search).toBe("?size=large");
  });

  it("keeps unrelated parameters", () => {
    const url = settingsUrl(new URL(`${base.href}?rate=10`), {
      ...defaultSettings,
      shadow: false,
    });
    expect(url.search).toBe("?rate=10&shadow=false");
  });

  it("round-trips through parseSettings", () => {
    const settings = {
      shadow: false,
      fontSize: "medium" as const,
      channelTag: false,
      timestamps: true,
      bttv: false,
      overlay: true,
    };
    expect(parseSettings(settingsUrl(base, settings).searchParams)).toEqual(
      settings,
    );
  });
});
