// Third-party emotes (BetterTTV, 7TV, ...): words in a message that the
// services' browser extensions show as images. Twitch itself only sends
// plain text for them.

/** Which service an emote comes from */
export type EmoteProviderName = "bttv" | "7tv";

export type Emote = {
  id: string;
  /** The word that is replaced by the emote, case-sensitive */
  code: string;
  /** The emote in increasing sizes, starting at 1x */
  images: EmoteImage[];
  provider: EmoteProviderName;
  /** Drawn on top of the emote before it, e.g. 7TV's RainTime */
  zeroWidth?: boolean;
  /**
   * Height relative to the service's normal emote height, for emotes made
   * shorter on purpose. Missing means 1.
   */
  heightScale?: number;
  /** Width / height, when the service says; keeps room while loading */
  aspectRatio?: number;
};

export type EmoteImage = {
  url: string;
  /** Size relative to the 1x image */
  density: number;
};

/** Emotes usable in a channel, by code */
export type EmoteMap = ReadonlyMap<string, Emote>;

export interface EmoteProvider {
  readonly name: EmoteProviderName;
  /** Emotes available in every channel */
  global(): Promise<Emote[]>;
  /** Emotes of one channel, by Twitch user id; empty for unknown channels */
  channel(channelId: string): Promise<Emote[]>;
}
