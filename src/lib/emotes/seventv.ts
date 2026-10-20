import type { Emote, EmoteImage, EmoteProvider } from "./Emote";
import { defaultFetch, fetchJson, type Fetch } from "./fetchJson";

// https://7tv.io/docs (v3 REST, read anonymously)
const api = "https://7tv.io/v3";

type SevenTvFile = { name?: string; height?: number };

/** An emote as it is added to a set */
type SevenTvActiveEmote = {
  id: string;
  /** Name in this set, channels may rename emotes */
  name: string;
  /** Bit 1: zero-width in this set */
  flags?: number;
  data?: {
    /** Bit 256: the emote itself is made to be zero-width */
    flags?: number;
    host?: { files?: SevenTvFile[] };
  };
};

type SevenTvEmoteSet = { emotes?: SevenTvActiveEmote[] | null };

type SevenTvUser = { emote_set?: SevenTvEmoteSet | null };

const zeroWidthInSet = 1;
const zeroWidthEmote = 1 << 8;

/** Height of a normal emote at 1x; shorter ones are drawn shorter */
const normalHeight = 32;

const webpFile = /^([1-4])x\.webp$/;

export function sevenTvEmoteImages(
  id: string,
  densities: number[] = [1, 2, 3, 4],
): EmoteImage[] {
  const base = `https://cdn.7tv.app/emote/${encodeURIComponent(id)}`;
  return densities.map((density) => ({
    url: `${base}/${density}x.webp`,
    density,
  }));
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
      .map((e) => {
        const files = Array.isArray(e.data?.host?.files)
          ? e.data.host.files
          : [];
        const emote: Emote = {
          id: e.id,
          code: e.name,
          images: sevenTvEmoteImages(e.id, densities(files)),
          provider: this.name,
          zeroWidth:
            ((e.flags ?? 0) & zeroWidthInSet) !== 0 ||
            ((e.data?.flags ?? 0) & zeroWidthEmote) !== 0,
        };
        const heightScale = this.heightScale(files);
        if (heightScale !== undefined) emote.heightScale = heightScale;
        return emote;
      });
  }

  /** For emotes shorter than normal, from the size of the 1x image */
  private heightScale(files: SevenTvFile[]): number | undefined {
    const height = files.find((f) => f?.name === "1x.webp")?.height;
    if (typeof height !== "number" || !(height > 0)) return undefined;
    return height < normalHeight ? height / normalHeight : undefined;
  }
}

/** Sizes the emote is available in; 1x only when the API doesn't say */
function densities(files: SevenTvFile[]): number[] {
  const found = files
    .map((f) => webpFile.exec(f?.name ?? "")?.[1])
    .filter((d) => d !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
  return found[0] === 1 ? [...new Set(found)] : [1];
}
