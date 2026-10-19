import type { ParsedMessage } from "#lib/chat/ChatMessage.ts";
import { ChatEmitter, type ChatStatus } from "#lib/chat/ChatSource.ts";
import { randomMessage } from "./fixtures";

export type FakeStreamOptions = {
  /** Messages per second */
  rate?: number;
  /** Chance per tick to delete a recent message (0..1) */
  deleteChance?: number;
  random?: () => number;
};

/**
 * In-memory ChatSource. Drive it manually from tests (push, remove, ...) or
 * call stream() to generate a live-looking chat for layout work.
 */
export class FakeChatSource extends ChatEmitter {
  connectedChannels: string[] | null = null;
  disconnected = false;

  private timer: ReturnType<typeof setInterval> | undefined;
  private recent: ParsedMessage[] = [];

  async connect(channels: string[]): Promise<void> {
    this.connectedChannels = channels;
    this.disconnected = false;
    this.setStatus({ kind: "ready" });
  }

  disconnect(): void {
    this.disconnected = true;
    this.stop();
  }

  push(...messages: ParsedMessage[]): void {
    for (const message of messages) {
      this.recent = [...this.recent.slice(-49), message];
      this.emit("message", message);
    }
  }

  remove(messageId: string): void {
    this.emit("messageRemoved", messageId);
  }

  clearUser(channel: string, userName: string): void {
    this.emit("userCleared", channel, userName);
  }

  clearChannel(channel: string): void {
    this.emit("channelCleared", channel);
  }

  setStatus(status: ChatStatus): void {
    this.emit("status", status);
  }

  stream(options: FakeStreamOptions = {}): void {
    const { rate = 5, deleteChance = 0, random = Math.random } = options;
    this.stop();
    this.timer = setInterval(() => {
      const channels = this.connectedChannels?.length
        ? this.connectedChannels
        : undefined;
      this.push(randomMessage(random, channels));

      if (this.recent.length > 0 && random() < deleteChance) {
        const victim = this.recent[Math.floor(random() * this.recent.length)];
        this.remove(victim.id);
      }
    }, 1000 / rate);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
