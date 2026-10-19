import { ChatClient, type ChatMessage } from "@twurple/chat";
import { MessageType } from "#lib/chat/ChatMessage.ts";
import { ChatEmitter } from "#lib/chat/ChatSource.ts";
import { parseMessage } from "./parseMessage";

type PageEvents = Pick<EventTarget, "addEventListener" | "removeEventListener">;

export type TwitchChatSourceOptions = {
  /** Log full message objects */
  debug?: boolean;
  /** Inject a client, mainly for tests */
  client?: ChatClient;
  /** Page lifecycle event targets, injectable for tests */
  document?: PageEvents & Pick<Document, "visibilityState">;
  window?: PageEvents;
};

/** Don't check the connection more often than this when the page resumes */
const minCheckIntervalMs = 5000;

/**
 * Anonymous read-only Twitch chat connection.
 *
 * twurple reconnects by itself after a dropped connection, but does not rejoin
 * channels that were joined manually. So channels are (re)joined every time
 * the client authenticates, which covers both the first connect and every
 * reconnect.
 */
export class TwitchChatSource extends ChatEmitter {
  private readonly client: ChatClient;
  private readonly debug: boolean;
  private readonly document?: TwitchChatSourceOptions["document"];
  private readonly window?: PageEvents;

  private channels: string[] = [];
  private active = false;
  /** Incremented to cancel a join round that is still running */
  private joinRound = 0;
  private lastCheck = 0;
  private resolveFirstJoin?: () => void;
  private unwatchPage?: () => void;

  constructor(options: TwitchChatSourceOptions = {}) {
    super();
    this.debug = options.debug ?? false;
    this.document = options.document ?? globalThis.document;
    this.window = options.window ?? globalThis.window;
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

    // fires after every successful (re)connect, once joining is possible
    this.client.onAuthenticationSuccess(() => {
      if (this.active) void this.joinChannels();
    });

    this.client.onDisconnect((manually, reason) => {
      if (manually || !this.active) return;
      console.warn("Disconnected from Twitch, reconnecting:", reason);
      this.joinRound++;
      this.emit("status", { kind: "reconnecting" });
    });
  }

  /** Resolves once all channels were joined for the first time */
  async connect(channels: string[]): Promise<void> {
    this.channels = channels;
    this.active = true;
    this.emit("status", { kind: "connecting" });

    const firstJoin = new Promise<void>((r) => (this.resolveFirstJoin = r));
    try {
      this.client.connect();
    } catch (error) {
      console.error("Failed to connect to Twitch:", error);
      this.emit("status", { kind: "error", message: String(error) });
      return;
    }

    this.watchPage();
    await firstJoin;
  }

  disconnect(): void {
    this.active = false;
    this.joinRound++;
    this.unwatchPage?.();
    this.client.quit();
  }

  /**
   * Verify the connection is still alive, e.g. after the device slept.
   * Timers don't run while asleep, so twurple's own inactivity ping would
   * only notice a dead socket a minute or more after waking up.
   */
  checkConnection(): void {
    if (!this.active) return;

    const now = Date.now();
    if (now - this.lastCheck < minCheckIntervalMs) return;
    this.lastCheck = now;

    if (!this.client.isConnected) {
      // a retry may be waiting in a backoff delay, start it right away
      if (!this.client.isConnecting) {
        console.log("Not connected, reconnecting now");
        this.client.reconnect();
      }
      return;
    }

    // a socket that died during sleep still looks connected; without a pong
    // within a few seconds the client reconnects
    console.log("Checking connection");
    this.client.irc.pingCheck();
  }

  private async joinChannels(): Promise<void> {
    const round = ++this.joinRound;

    for (const channel of this.channels) {
      this.emit("status", { kind: "joining", channel });
      await this.client.join(channel).catch((error) => {
        console.error("Failed to join channel:", error);
      });
      // disconnected again (or stopped) while joining
      if (round !== this.joinRound) return;
    }

    this.emit("status", { kind: "ready" });
    this.resolveFirstJoin?.();
    this.resolveFirstJoin = undefined;
  }

  private watchPage(): void {
    this.unwatchPage?.();
    const { document, window } = this;
    if (!document || !window) return;

    const check = () => this.checkConnection();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    // Page Lifecycle API: the page was frozen and is running again
    document.addEventListener("resume", check);
    window.addEventListener("online", check);
    // restored from the back/forward cache
    window.addEventListener("pageshow", check);

    this.unwatchPage = () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("resume", check);
      window.removeEventListener("online", check);
      window.removeEventListener("pageshow", check);
      this.unwatchPage = undefined;
    };
  }

  private log(message: string, data: object, msg: ChatMessage) {
    if (this.debug) {
      console.log(message, { ...data, msg });
    } else {
      console.debug(message, data);
    }
  }
}
