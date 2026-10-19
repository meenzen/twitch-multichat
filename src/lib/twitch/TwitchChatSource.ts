import { ChatClient, type ChatMessage } from "@twurple/chat";
import { MessageType } from "#lib/chat/ChatMessage.ts";
import { ChatEmitter } from "#lib/chat/ChatSource.ts";
import { parseMessage } from "./parseMessage";

export type TwitchChatSourceOptions = {
  /** Log full message objects */
  debug?: boolean;
  /** Inject a client, mainly for tests */
  client?: ChatClient;
};

/** Anonymous read-only Twitch chat connection */
export class TwitchChatSource extends ChatEmitter {
  private readonly client: ChatClient;
  private readonly debug: boolean;

  constructor(options: TwitchChatSourceOptions = {}) {
    super();
    this.debug = options.debug ?? false;
    this.client =
      options.client ??
      new ChatClient({
        logger: { minLevel: this.debug ? "INFO" : "WARNING" },
      });

    this.client.onMessage((channel, user, text, msg) => {
      this.log("Message received:", { channel, user, text }, msg);
      this.emit(
        "message",
        parseMessage({ message: msg, type: MessageType.Normal }),
      );
    });

    this.client.onAction((channel, user, text, msg) => {
      this.log("Action message received:", { channel, user, text }, msg);
      this.emit(
        "message",
        parseMessage({ message: msg, type: MessageType.Action }),
      );
    });

    this.client.onMessageRemove((channel, messageId) => {
      console.log("Clearing message:", { channel, messageId });
      this.emit("messageRemoved", messageId);
    });

    // twurple reports user-targeted CLEARCHAT as ban/timeout, not as chat clear
    this.client.onBan((channel, user) => {
      console.log("Clearing banned user:", { channel, user });
      this.emit("userCleared", channel, user);
    });

    this.client.onTimeout((channel, user) => {
      console.log("Clearing timed out user:", { channel, user });
      this.emit("userCleared", channel, user);
    });

    this.client.onChatClear((channel) => {
      console.log("Clearing channel:", { channel });
      this.emit("channelCleared", channel);
    });
  }

  async connect(channels: string[]): Promise<void> {
    this.emit("status", { kind: "connecting" });
    try {
      this.client.connect();
    } catch (error) {
      console.error("Failed to connect to Twitch:", error);
      this.emit("status", { kind: "error", message: String(error) });
      return;
    }

    for (const channel of channels) {
      this.emit("status", { kind: "joining", channel });
      await this.client.join(channel).catch((error) => {
        console.error("Failed to join channel:", error);
      });
    }

    this.emit("status", { kind: "ready" });
  }

  disconnect(): void {
    this.client.quit();
  }

  private log(message: string, data: object, msg: ChatMessage) {
    if (this.debug) {
      console.log(message, { ...data, msg });
    } else {
      console.debug(message, data);
    }
  }
}
