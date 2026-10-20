// Third-party emotes (BetterTTV, later 7TV, FFZ, ...): words in a message
// that the services' browser extensions show as images. Twitch itself only
// sends plain text for them.

/** Which service an emote comes from */
export type EmoteProviderName = "bttv";

export type Emote = {
  id: string;
  /** The word that is replaced by the emote, case-sensitive */
  code: string;
  /** Image at 1x scale */
  url: string;
  provider: EmoteProviderName;
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
