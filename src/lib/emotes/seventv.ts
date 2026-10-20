import type { Emote, EmoteProvider } from "./Emote";
import { defaultFetch, fetchJson, type Fetch } from "./fetchJson";

// https://7tv.io/docs (v3 REST, read anonymously)
const api = "https://7tv.io/v3";

/** An emote as it is added to a set */
type SevenTvActiveEmote = {
  id: string;
  /** Name in this set, channels may rename emotes */
  name: string;
  /** Bit 1: zero-width in this set */
  flags?: number;
  /** Bit 256: the emote itself is made to be zero-width */
  data?: { flags?: number };
};

type SevenTvEmoteSet = { emotes?: SevenTvActiveEmote[] | null };

type SevenTvUser = { emote_set?: SevenTvEmoteSet | null };

const zeroWidthInSet = 1;
const zeroWidthEmote = 1 << 8;

export function sevenTvEmoteUrl(id: string): string {
  return `https://cdn.7tv.app/emote/${encodeURIComponent(id)}/1x.webp`;
}

/** 7TV emotes: the global set and each channel's active set */
export class SevenTvEmotes implements EmoteProvider {
  readonly name = "7tv";

  constructor(private readonly fetch: Fetch = defaultFetch) {}

  async global(): Promise<Emote[]> {
    const set = await fetchJson<SevenTvEmoteSet>(
      this.fetch,
      `${api}/emote-sets/global`,
    );
    return this.toEmotes(set?.emotes);
  }

  async channel(channelId: string): Promise<Emote[]> {
    const user = await fetchJson<SevenTvUser>(
      this.fetch,
      `${api}/users/twitch/${encodeURIComponent(channelId)}`,
    );
    // 404: the channel has no 7TV account
    return this.toEmotes(user?.emote_set?.emotes);
  }

  private toEmotes(list: SevenTvActiveEmote[] | null | undefined): Emote[] {
    if (!Array.isArray(list)) return [];
    return list
      .filter(
        (e) =>
          typeof e?.id === "string" &&
          typeof e.name === "string" &&
          e.name !== "",
      )
      .map((e) => ({
        id: e.id,
        code: e.name,
        url: sevenTvEmoteUrl(e.id),
        provider: this.name,
        zeroWidth:
          ((e.flags ?? 0) & zeroWidthInSet) !== 0 ||
          ((e.data?.flags ?? 0) & zeroWidthEmote) !== 0,
      }));
  }
}
