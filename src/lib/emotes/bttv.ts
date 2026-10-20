import type { Emote, EmoteChange, EmoteImage, EmoteProvider } from "./Emote";
import { defaultFetch, fetchJson, type Fetch } from "./fetchJson";
import { LiveSocket, createWebSocket, type CreateSocket } from "./LiveSocket";

// https://betterttv.com/developers/api
const api = "https://api.betterttv.net/3";
const socketUrl = "wss://sockets.betterttv.net/ws";

type BttvEmote = { id: string; code: string; modifier?: boolean };

type BttvUser = {
  channelEmotes?: BttvEmote[];
  sharedEmotes?: BttvEmote[];
};

/** Pushed by the socket to channels it joined, as `twitch:<id>` */
type BttvLiveMessage =
  | { name: "emote_create"; data: { channel: string; emote: BttvEmote } }
  | { name: "emote_update"; data: { channel: string; emote: BttvEmote } }
  | { name: "emote_delete"; data: { channel: string; emoteId: string } };

type Watcher = (change: EmoteChange) => void;

/** Every BetterTTV emote comes in 1x (28px high), 2x and 3x */
export function bttvEmoteImages(id: string): EmoteImage[] {
  const base = `https://cdn.betterttv.net/emote/${encodeURIComponent(id)}`;
  return [1, 2, 3].map((density) => ({
    url: `${base}/${density}x.webp`,
    density,
  }));
}

/**
 * BetterTTV emotes, read anonymously from the public API. Channel changes
 * arrive over one socket for all watched channels.
 */
export class BttvEmotes implements EmoteProvider {
  readonly name = "bttv";

  private watchers = new Map<string, Watcher>();
  private readonly live: LiveSocket;

  constructor(
    private readonly fetch: Fetch = defaultFetch,
    createSocket: CreateSocket = createWebSocket,
  ) {
    // no heartbeats: a quiet socket is normal
    this.live = new LiveSocket({
      url: socketUrl,
      createSocket,
      onOpen: (reconnect) => this.onOpen(reconnect),
      onMessage: (data) => this.onMessage(data),
    });
  }

  async global(): Promise<Emote[]> {
    return toEmotes(
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
    return toEmotes([
      ...(user.sharedEmotes ?? []),
      ...(user.channelEmotes ?? []),
    ]);
  }

  watch(channelId: string, onChange: Watcher): () => void {
    this.watchers.set(channelId, onChange);
    this.live.start();
    this.join(channelId);
    return () => {
      if (this.watchers.get(channelId) !== onChange) return;
      this.watchers.delete(channelId);
      this.live.send({
        name: "part_channel",
        data: { name: `twitch:${channelId}` },
      });
      if (this.watchers.size === 0) this.live.stop();
    };
  }

  private join(channelId: string): void {
    this.live.send({
      name: "join_channel",
      data: { name: `twitch:${channelId}` },
    });
  }

  private onOpen(reconnect: boolean): void {
    for (const channelId of this.watchers.keys()) this.join(channelId);
    // changes made while disconnected are lost, fetch the lists again
    if (reconnect) {
      for (const watcher of this.watchers.values()) watcher({ kind: "reload" });
    }
  }

  private onMessage(data: string): void {
    let message: BttvLiveMessage;
    try {
      message = JSON.parse(data) as BttvLiveMessage;
    } catch {
      return;
    }
    const channel = message?.data?.channel;
    if (typeof channel !== "string") return;
    const watcher = this.watchers.get(channel.replace(/^twitch:/, ""));
    if (!watcher) return;

    switch (message.name) {
      case "emote_create":
      case "emote_update": {
        const emote = toEmote(message.data.emote);
        if (emote) {
          const kind = message.name === "emote_create" ? "add" : "update";
          watcher({ kind, emote });
        }
        break;
      }
      case "emote_delete":
        if (typeof message.data.emoteId === "string") {
          watcher({ kind: "remove", id: message.data.emoteId });
        }
        break;
    }
  }
}

function toEmotes(list: BttvEmote[] | undefined): Emote[] {
  if (!Array.isArray(list)) return [];
  return list.map(toEmote).filter((e) => e !== undefined);
}

function toEmote(e: BttvEmote | undefined): Emote | undefined {
  if (typeof e?.id !== "string" || typeof e.code !== "string" || !e.code) {
    return undefined;
  }
  // modifiers (c!, h!, ...) change the emote before them, which isn't
  // supported; they stay text
  if (e.modifier) return undefined;
  return {
    id: e.id,
    code: e.code,
    images: bttvEmoteImages(e.id),
    provider: "bttv",
  };
}
