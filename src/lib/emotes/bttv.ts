import type { Emote, EmoteImage, EmoteProvider } from "./Emote";
import { defaultFetch, fetchJson, type Fetch } from "./fetchJson";

// https://betterttv.com/developers/api
const api = "https://api.betterttv.net/3";

type BttvEmote = { id: string; code: string; modifier?: boolean };

type BttvUser = {
  channelEmotes?: BttvEmote[];
  sharedEmotes?: BttvEmote[];
};

/** Every BetterTTV emote comes in 1x (28px high), 2x and 3x */
export function bttvEmoteImages(id: string): EmoteImage[] {
  const base = `https://cdn.betterttv.net/emote/${encodeURIComponent(id)}`;
  return [1, 2, 3].map((density) => ({
    url: `${base}/${density}x.webp`,
    density,
  }));
}

/** BetterTTV emotes, read anonymously from the public API */
export class BttvEmotes implements EmoteProvider {
  readonly name = "bttv";

  constructor(private readonly fetch: Fetch = defaultFetch) {}

  async global(): Promise<Emote[]> {
    return this.toEmotes(
      await fetchJson<BttvEmote[]>(this.fetch, `${api}/cached/emotes/global`),
    );
  }

  async channel(channelId: string): Promise<Emote[]> {
    const user = await fetchJson<BttvUser>(
      this.fetch,
      `${api}/cached/users/twitch/${encodeURIComponent(channelId)}`,
    );
    // 404: the channel never set up BetterTTV
    if (!user) return [];
    return this.toEmotes([
      ...(user.sharedEmotes ?? []),
      ...(user.channelEmotes ?? []),
    ]);
  }

  private toEmotes(list: BttvEmote[] | undefined): Emote[] {
    if (!Array.isArray(list)) return [];
    return (
      list
        // modifiers (c!, h!, ...) change the emote before them, which isn't
        // supported; they stay text
        .filter(
          (e) =>
            typeof e?.id === "string" &&
            typeof e.code === "string" &&
            e.code !== "" &&
            !e.modifier,
        )
        .map((e) => ({
          id: e.id,
          code: e.code,
          images: bttvEmoteImages(e.id),
          provider: this.name,
        }))
    );
  }
}
