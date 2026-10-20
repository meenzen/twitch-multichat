// Chat settings and how they map to query parameters. Only values that differ
// from the default end up in the URL, so shared links stay short and pick up
// new defaults.

import type { EmoteProviderName } from "#lib/emotes/Emote.ts";

/** Chat text size in px for each preset */
export const fontSizes = {
  small: 13,
  medium: 16,
  large: 20,
  huge: 26,
} as const;

export type FontSize = keyof typeof fontSizes;

export type ChatSettings = {
  /** Outline around user and channel names */
  shadow: boolean;
  fontSize: FontSize;
  /** The [channel] prefix in front of every message */
  channelTag: boolean;
  /** HH:MM in front of every message */
  timestamps: boolean;
  /** BetterTTV emotes as images instead of text */
  bttv: boolean;
  /** 7TV emotes as images instead of text */
  sevenTv: boolean;
  /** For streaming software: no top bar, transparent background */
  overlay: boolean;
};

export const defaultSettings: Readonly<ChatSettings> = Object.freeze({
  shadow: true,
  fontSize: "small",
  channelTag: true,
  timestamps: false,
  bttv: true,
  sevenTv: true,
  overlay: false,
});

/** Third-party emote providers whose emotes are shown as text */
export function hiddenEmoteProviders(
  settings: Pick<ChatSettings, "bttv" | "sevenTv">,
): EmoteProviderName[] {
  const hidden: EmoteProviderName[] = [];
  if (!settings.bttv) hidden.push("bttv");
  if (!settings.sevenTv) hidden.push("7tv");
  return hidden;
}

type Codec<T> = {
  param: string;
  /** undefined for anything that is not a valid value */
  parse(value: string): T | undefined;
  format(value: T): string;
};

const boolean = (param: string): Codec<boolean> => ({
  param,
  parse: (value) =>
    value === "true" ? true : value === "false" ? false : undefined,
  format: String,
});

const oneOf = <T extends string>(param: string, values: T[]): Codec<T> => ({
  param,
  parse: (value) => values.find((v) => v === value),
  format: (value) => value,
});

const codecs: { [K in keyof ChatSettings]: Codec<ChatSettings[K]> } = {
  shadow: boolean("shadow"),
  fontSize: oneOf("size", Object.keys(fontSizes) as FontSize[]),
  channelTag: boolean("channel"),
  timestamps: boolean("timestamps"),
  bttv: boolean("bttv"),
  sevenTv: boolean("7tv"),
  overlay: boolean("overlay"),
};

const keys = Object.keys(codecs) as (keyof ChatSettings)[];

/** Missing or invalid parameters fall back to the default */
export function parseSettings(
  params: Pick<URLSearchParams, "get">,
): ChatSettings {
  const settings = { ...defaultSettings };
  for (const key of keys) {
    const value = params.get(codecs[key].param);
    const parsed = value === null ? undefined : codecs[key].parse(value);
    if (parsed !== undefined) {
      (settings as Record<string, unknown>)[key] = parsed;
    }
  }
  return settings;
}

/** Copy of `url` with the settings applied, other parameters are kept */
export function settingsUrl(url: URL, settings: ChatSettings): URL {
  const result = new URL(url);
  for (const key of keys) {
    const codec = codecs[key] as Codec<ChatSettings[typeof key]>;
    if (settings[key] === defaultSettings[key]) {
      result.searchParams.delete(codec.param);
    } else {
      result.searchParams.set(codec.param, codec.format(settings[key]));
    }
  }
  return result;
}

/** Whether the parameters contain any setting, valid or not */
export function hasSettings(params: Pick<URLSearchParams, "has">): boolean {
  return keys.some((key) => params.has(codecs[key].param));
}

/** Query string (without `?`) of the settings that differ from the default */
export function settingsQuery(settings: ChatSettings): string {
  return settingsUrl(
    new URL("http://localhost"),
    settings,
  ).searchParams.toString();
}
