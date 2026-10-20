import type { Emote, EmoteChange, EmoteImage, EmoteProvider } from "./Emote";
import { defaultFetch, fetchJson, type Fetch } from "./fetchJson";
import { LiveSocket, createWebSocket, type CreateSocket } from "./LiveSocket";

// https://7tv.io/docs (v3 REST, read anonymously)
const api = "https://7tv.io/v3";
// https://github.com/SevenTV/EventAPI
const eventsUrl = "wss://events.7tv.io/v3";

type SevenTvFile = { name?: string; width?: number; height?: number };

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

type SevenTvEmoteSet = {
  id?: string;
  emotes?: SevenTvActiveEmote[] | null;
};

type SevenTvUser = {
  emote_set?: SevenTvEmoteSet | null;
  /** The 7TV account behind the Twitch channel */
  user?: { id?: string } | null;
};

/** One entry of a dispatch's pushed / pulled / updated lists */
type ChangeField = {
  key?: string;
  value?: unknown;
  old_value?: unknown;
};

type Dispatch = {
  type?: string;
  body?: {
    id?: string;
    pushed?: ChangeField[];
    pulled?: ChangeField[];
    updated?: ChangeField[];
  };
};

/** EventAPI opcodes this client handles */
const op = {
  dispatch: 0,
  hello: 1,
  reconnect: 4,
  subscribe: 35,
  unsubscribe: 36,
} as const;

/** What a watched channel is subscribed to */
type Watched = {
  onChange: (change: EmoteChange) => void;
  /** Active emote set, its changes are the channel's emote changes */
  setId?: string;
  /** 7TV account, it switches the active set */
  userId?: string;
};

const zeroWidthInSet = 1;
const zeroWidthEmote = 1 << 8;

/** Height of a normal emote at 1x; shorter ones are drawn shorter */
const normalHeight = 32;

/** Until the hello says otherwise: the server's 45s, missed three times */
const defaultSilenceMs = 3 * 45_000;

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

/**
 * 7TV emotes: the global set and each channel's active set. Changes come
 * from the EventAPI, subscribed per emote set and per account (not per
 * channel: that would also deliver every chatter's personal emotes).
 */
export class SevenTvEmotes implements EmoteProvider {
  readonly name = "7tv";

  /** Set and account ids from the last channel load, by Twitch id */
  private accounts = new Map<string, { setId?: string; userId?: string }>();
  private watched = new Map<string, Watched>();
  /** What the current connection is subscribed to, see `sync()` */
  private subscribed = new Set<string>();
  private readonly live: LiveSocket;

  constructor(
    private readonly fetch: Fetch = defaultFetch,
    createSocket: CreateSocket = createWebSocket,
  ) {
    this.live = new LiveSocket({
      url: eventsUrl,
      createSocket,
      silenceTimeoutMs: defaultSilenceMs,
      onOpen: (reconnect) => this.onOpen(reconnect),
      onMessage: (data) => this.onMessage(data),
    });
  }

  async global(): Promise<Emote[]> {
    const set = await fetchJson<SevenTvEmoteSet>(
      this.fetch,
      `${api}/emote-sets/global`,
    );
    return toEmotes(set?.emotes);
  }

  async channel(channelId: string): Promise<Emote[]> {
    const user = await fetchJson<SevenTvUser>(
      this.fetch,
      `${api}/users/twitch/${encodeURIComponent(channelId)}`,
    );
    // 404: the channel has no 7TV account
    this.accounts.set(channelId, {
      setId: stringOrUndefined(user?.emote_set?.id),
      userId: stringOrUndefined(user?.user?.id),
    });
    // after a set switch: follow the new set
    const watched = this.watched.get(channelId);
    if (watched) {
      Object.assign(watched, this.accounts.get(channelId));
      this.sync();
    }
    return toEmotes(user?.emote_set?.emotes);
  }

  watch(
    channelId: string,
    onChange: (change: EmoteChange) => void,
  ): () => void {
    const watched: Watched = { onChange, ...this.accounts.get(channelId) };
    this.watched.set(channelId, watched);
    this.live.start();
    this.sync();
    return () => {
      if (this.watched.get(channelId) !== watched) return;
      this.watched.delete(channelId);
      this.sync();
      if (this.watched.size === 0) this.live.stop();
    };
  }

  /**
   * Bring the server's subscriptions in line with the watched channels.
   * Each one only once: subscribing twice makes the server close the
   * connection, and channels can share an emote set.
   */
  private sync(): void {
    if (!this.live.connected) return;
    const wanted = new Set<string>();
    for (const { setId, userId } of this.watched.values()) {
      if (setId) wanted.add(`emote_set.update ${setId}`);
      if (userId) wanted.add(`user.update ${userId}`);
    }
    for (const subscription of this.subscribed) {
      if (!wanted.has(subscription)) this.send(op.unsubscribe, subscription);
    }
    for (const subscription of wanted) {
      if (!this.subscribed.has(subscription)) {
        this.send(op.subscribe, subscription);
      }
    }
    this.subscribed = wanted;
  }

  /** `subscription`: "<type> <object id>" */
  private send(code: number, subscription: string): void {
    const [type, objectId] = subscription.split(" ");
    this.live.send({
      op: code,
      d: { type, condition: { object_id: objectId } },
    });
  }

  private onOpen(reconnect: boolean): void {
    // a new connection starts without subscriptions
    this.subscribed = new Set();
    this.sync();
    // the server doesn't replay what was missed
    if (reconnect) {
      for (const watched of this.watched.values()) {
        watched.onChange({ kind: "reload" });
      }
    }
  }

  private onMessage(data: string): void {
    let message: { op?: number; d?: unknown };
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }

    switch (message?.op) {
      case op.hello: {
        const interval = (message.d as { heartbeat_interval?: unknown })
          ?.heartbeat_interval;
        // three missed heartbeats mean the connection is gone
        if (typeof interval === "number" && interval > 0) {
          this.live.setSilenceTimeout(3 * interval);
        }
        break;
      }
      case op.reconnect:
        this.live.reconnect();
        break;
      case op.dispatch:
        this.onDispatch(message.d as Dispatch);
        break;
    }
  }

  private onDispatch(dispatch: Dispatch | undefined): void {
    const id = dispatch?.body?.id;
    if (!id) return;

    for (const watched of this.watched.values()) {
      if (dispatch.type === "emote_set.update" && watched.setId === id) {
        for (const change of emoteSetChanges(dispatch)) {
          watched.onChange(change);
        }
      }
      if (
        dispatch.type === "user.update" &&
        watched.userId === id &&
        switchedEmoteSet(dispatch)
      ) {
        // the new set's emotes and id come with the channel's reload
        watched.onChange({ kind: "reload" });
      }
    }
  }
}

function emoteSetChanges(dispatch: Dispatch): EmoteChange[] {
  const changes: EmoteChange[] = [];
  const body = dispatch.body ?? {};
  for (const field of list(body.pushed)) {
    const emote = field.key === "emotes" ? toEmote(field.value) : undefined;
    if (emote) changes.push({ kind: "add", emote });
  }
  for (const field of list(body.pulled)) {
    const id = (field.old_value as { id?: unknown } | null)?.id;
    if (field.key === "emotes" && typeof id === "string") {
      changes.push({ kind: "remove", id });
    }
  }
  for (const field of list(body.updated)) {
    const emote = field.key === "emotes" ? toEmote(field.value) : undefined;
    if (emote) changes.push({ kind: "update", emote });
  }
  return changes;
}

/** The account's connections changed their emote set */
function switchedEmoteSet(dispatch: Dispatch): boolean {
  return list(dispatch.body?.updated).some(
    (field) =>
      field.key === "connections" &&
      list(field.value as ChangeField[]).some((f) => f?.key === "emote_set"),
  );
}

function list<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function toEmotes(list: SevenTvActiveEmote[] | null | undefined): Emote[] {
  if (!Array.isArray(list)) return [];
  return list.map(toEmote).filter((e) => e !== undefined);
}

function toEmote(value: unknown): Emote | undefined {
  const e = value as SevenTvActiveEmote | null | undefined;
  if (typeof e?.id !== "string" || typeof e.name !== "string" || !e.name) {
    return undefined;
  }
  const files = Array.isArray(e.data?.host?.files) ? e.data.host.files : [];
  const emote: Emote = {
    id: e.id,
    code: e.name,
    images: sevenTvEmoteImages(e.id, densities(files)),
    provider: "7tv",
    zeroWidth:
      ((e.flags ?? 0) & zeroWidthInSet) !== 0 ||
      ((e.data?.flags ?? 0) & zeroWidthEmote) !== 0,
  };
  const size = imageSize(files);
  if (size) {
    emote.aspectRatio = size.width / size.height;
    if (size.height < normalHeight) {
      emote.heightScale = size.height / normalHeight;
    }
  }
  return emote;
}

/** Size of the 1x image, if the API reports a usable one */
function imageSize(
  files: SevenTvFile[],
): { width: number; height: number } | undefined {
  const file = files.find((f) => f?.name === "1x.webp");
  const { width, height } = file ?? {};
  if (typeof width !== "number" || typeof height !== "number") return;
  if (!(width > 0 && height > 0)) return;
  return { width, height };
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
