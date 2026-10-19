import {
  isMessage,
  type ChatEntry,
  type DisconnectEntry,
  type ParsedMessage,
} from "./ChatMessage";
import type { ChatSource, ChatStatus } from "./ChatSource";

export type RemovalReason = "message" | "user" | "channel";

export type ChatStoreOptions = {
  /** Messages kept while the view follows the newest message */
  bufferSize?: number;
  /** Called whenever messages were removed by moderation */
  onRemove?: (reason: RemovalReason, count: number) => void;
  /** Clock, injectable for tests */
  now?: () => number;
};

/**
 * Reactive message buffer. Knows nothing about Twitch or the DOM: it consumes
 * events from a ChatSource and exposes the messages and connection status.
 */
export class ChatStore {
  /** Messages, plus a marker wherever the connection dropped */
  messages: ChatEntry[] = $state.raw([]);
  status: ChatStatus = $state.raw({ kind: "idle" });

  /**
   * Whether the view is pinned to the newest message. While the user scrolled
   * up, the buffer grows so that messages don't disappear while reading.
   */
  following = $state(true);

  readonly bufferSize: number;
  private readonly onRemove?: ChatStoreOptions["onRemove"];
  private readonly now: () => number;
  /** Set while the connection is down */
  private disconnectedSince?: number;

  constructor(options: ChatStoreOptions = {}) {
    this.bufferSize = options.bufferSize ?? 500;
    this.onRemove = options.onRemove;
    this.now = options.now ?? Date.now;
  }

  get limit(): number {
    return this.following ? this.bufferSize : this.bufferSize * 2;
  }

  /** Subscribe to a source, returns a function that unsubscribes again */
  attach(source: ChatSource): () => void {
    const unsubscribers = [
      source.on("message", (message) => this.add(message)),
      source.on("messageRemoved", (id) => this.removeMessage(id)),
      source.on("userCleared", (channel, user) =>
        this.clearUser(channel, user),
      ),
      source.on("channelCleared", (channel) => this.clearChannel(channel)),
      source.on("status", (status) => this.setStatus(status)),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  add(entry: ChatEntry): void {
    const next = [...this.messages, entry];
    const overflow = next.length - this.limit;
    if (overflow > 0) {
      next.splice(0, overflow);
    }
    this.messages = next;
  }

  setStatus(status: ChatStatus): void {
    this.status = status;

    if (status.kind === "reconnecting") {
      // keep the start of the outage across failed reconnect attempts
      this.disconnectedSince ??= status.since ?? this.now();
    } else if (status.kind === "ready" && this.disconnectedSince != null) {
      this.markDisconnect(this.disconnectedSince, this.now());
      this.disconnectedSince = undefined;
    }
  }

  removeMessage(id: string): void {
    const target = id.toLowerCase();
    this.removeWhere("message", (m) => m.id.toLowerCase() === target);
  }

  clearUser(channel: string, userName: string): void {
    const c = normalize(channel);
    const u = userName.toLowerCase();
    this.removeWhere(
      "user",
      (m) => m.channel === c && m.userName.toLowerCase() === u,
    );
  }

  clearChannel(channel: string): void {
    const c = normalize(channel);
    this.removeWhere("channel", (m) => m.channel === c);
  }

  private markDisconnect(since: number, until: number): void {
    const last = this.messages.at(-1);
    if (last && !isMessage(last)) {
      // nothing arrived in between, so it is one gap
      const merged: DisconnectEntry = { ...last, until };
      this.messages = [...this.messages.slice(0, -1), merged];
      return;
    }
    this.add({ kind: "disconnect", id: `disconnect-${since}`, since, until });
  }

  private removeWhere(
    reason: RemovalReason,
    predicate: (message: ParsedMessage) => boolean,
  ): void {
    const next = this.messages.filter((m) => !isMessage(m) || !predicate(m));
    const removed = this.messages.length - next.length;
    if (removed > 0) {
      this.messages = next;
      this.onRemove?.(reason, removed);
    }
  }
}

function normalize(channel: string): string {
  return channel.replace(/^#/, "").toLowerCase();
}
