import type { ParsedMessage } from "./ChatMessage";
import type { ChatSource, ChatStatus } from "./ChatSource";

export type RemovalReason = "message" | "user" | "channel";

export type ChatStoreOptions = {
  /** Messages kept while the view follows the newest message */
  bufferSize?: number;
  /** Called whenever messages were removed by moderation */
  onRemove?: (reason: RemovalReason, count: number) => void;
};

/**
 * Reactive message buffer. Knows nothing about Twitch or the DOM: it consumes
 * events from a ChatSource and exposes the messages and connection status.
 */
export class ChatStore {
  messages: ParsedMessage[] = $state.raw([]);
  status: ChatStatus = $state.raw({ kind: "idle" });

  /**
   * Whether the view is pinned to the newest message. While the user scrolled
   * up, the buffer grows so that messages don't disappear while reading.
   */
  following = $state(true);

  readonly bufferSize: number;
  private readonly onRemove?: ChatStoreOptions["onRemove"];

  constructor(options: ChatStoreOptions = {}) {
    this.bufferSize = options.bufferSize ?? 500;
    this.onRemove = options.onRemove;
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
      source.on("status", (status) => (this.status = status)),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  add(message: ParsedMessage): void {
    const next = [...this.messages, message];
    const overflow = next.length - this.limit;
    if (overflow > 0) {
      next.splice(0, overflow);
    }
    this.messages = next;
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

  private removeWhere(
    reason: RemovalReason,
    predicate: (message: ParsedMessage) => boolean,
  ): void {
    const next = this.messages.filter((m) => !predicate(m));
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
