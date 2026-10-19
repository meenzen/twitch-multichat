import type { ParsedMessage } from "./ChatMessage";

export type ChatStatus =
  | { kind: "idle" }
  | { kind: "connecting" }
  | { kind: "joining"; channel: string }
  | { kind: "ready" }
  /** The connection dropped unexpectedly, a reconnect is underway */
  | {
      kind: "reconnecting";
      /** Last time the connection was known to work (ms since epoch) */
      since?: number;
    }
  | { kind: "error"; message: string };

export type ChatEvents = {
  message: (message: ParsedMessage) => void;
  messageRemoved: (messageId: string) => void;
  /** All messages of a user in a channel should be removed (ban / timeout) */
  userCleared: (channel: string, userName: string) => void;
  /** All messages in a channel should be removed */
  channelCleared: (channel: string) => void;
  status: (status: ChatStatus) => void;
};

/**
 * A stream of chat events. The UI only ever talks to this interface, so the
 * Twitch connection can be swapped for a fake one in tests and dev pages.
 */
export interface ChatSource {
  connect(channels: string[]): Promise<void>;
  disconnect(): void;
  on<K extends keyof ChatEvents>(event: K, handler: ChatEvents[K]): () => void;
}

type AnyHandler = (...args: never[]) => void;

export abstract class ChatEmitter implements ChatSource {
  private handlers = new Map<keyof ChatEvents, Set<AnyHandler>>();

  abstract connect(channels: string[]): Promise<void>;
  abstract disconnect(): void;

  on<K extends keyof ChatEvents>(event: K, handler: ChatEvents[K]): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  protected emit<K extends keyof ChatEvents>(
    event: K,
    ...args: Parameters<ChatEvents[K]>
  ): void {
    for (const handler of this.handlers.get(event) ?? []) {
      (handler as unknown as (...a: Parameters<ChatEvents[K]>) => void)(
        ...args,
      );
    }
  }
}
