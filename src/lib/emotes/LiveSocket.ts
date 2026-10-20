/** The parts of a WebSocket that LiveSocket uses, so tests can fake it */
export type SocketLike = {
  send(data: string): void;
  close(): void;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
};

export type CreateSocket = (url: string) => SocketLike;

export const createWebSocket: CreateSocket = (url) =>
  new WebSocket(url) as unknown as SocketLike;

export type LiveSocketOptions = {
  url: string;
  createSocket?: CreateSocket;
  /** Connected; `reconnect` is true when an earlier connection was lost */
  onOpen(reconnect: boolean): void;
  onMessage(data: string): void;
  /**
   * Reconnect when nothing arrived for this long. Sockets of a device that
   * slept can stay open without delivering anything. Only for services
   * that send heartbeats; without one a quiet socket is normal.
   */
  silenceTimeoutMs?: number;
  minRetryMs?: number;
  maxRetryMs?: number;
};

/**
 * A WebSocket that reconnects with growing delays until stopped. Used for
 * the emote services' live updates; each service adds its own protocol.
 */
export class LiveSocket {
  private socket?: SocketLike;
  private opened = false;
  private running = false;
  private connectedBefore = false;
  private retryMs: number;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private silenceTimer?: ReturnType<typeof setTimeout>;
  private silenceTimeoutMs?: number;

  constructor(private readonly options: LiveSocketOptions) {
    this.retryMs = options.minRetryMs ?? 1000;
    this.silenceTimeoutMs = options.silenceTimeoutMs;
  }

  get connected(): boolean {
    return this.socket !== undefined && this.opened;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.connect();
  }

  stop(): void {
    this.running = false;
    this.connectedBefore = false;
    clearTimeout(this.retryTimer);
    clearTimeout(this.silenceTimer);
    this.drop();
  }

  /** Sends if connected; callers resend their state in onOpen */
  send(data: unknown): void {
    if (this.connected) this.socket?.send(JSON.stringify(data));
  }

  /** Drop the connection and connect again, e.g. when the server asks */
  reconnect(): void {
    if (this.running) this.reconnectLater();
  }

  /** E.g. from the service's hello message */
  setSilenceTimeout(ms: number): void {
    this.silenceTimeoutMs = ms;
    this.watchSilence();
  }

  private connect(): void {
    const socket = (this.options.createSocket ?? createWebSocket)(
      this.options.url,
    );
    this.socket = socket;
    this.opened = false;

    socket.onopen = () => {
      this.opened = true;
      this.retryMs = this.options.minRetryMs ?? 1000;
      const reconnect = this.connectedBefore;
      this.connectedBefore = true;
      console.log(
        `${reconnect ? "Reconnected" : "Connected"} to ${this.options.url}`,
      );
      this.watchSilence();
      this.options.onOpen(reconnect);
    };
    socket.onmessage = (event) => {
      this.watchSilence();
      if (typeof event.data === "string") this.options.onMessage(event.data);
    };
    // an error is followed by close
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.reconnectLater();
    };
    this.watchSilence();
  }

  private reconnectLater(): void {
    this.drop();
    clearTimeout(this.silenceTimer);
    if (!this.running) return;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.connect(), this.retryMs);
    this.retryMs = Math.min(
      this.retryMs * 2,
      this.options.maxRetryMs ?? 30_000,
    );
  }

  private watchSilence(): void {
    clearTimeout(this.silenceTimer);
    if (!this.running || this.silenceTimeoutMs === undefined) return;
    this.silenceTimer = setTimeout(() => {
      console.warn(`${this.options.url} went silent, reconnecting`);
      this.reconnectLater();
    }, this.silenceTimeoutMs);
  }

  private drop(): void {
    const socket = this.socket;
    this.socket = undefined;
    this.opened = false;
    if (!socket) return;
    socket.onopen = socket.onmessage = socket.onclose = null;
    socket.onerror = () => {};
    try {
      socket.close();
    } catch {
      // closing a socket that never connected can throw in some browsers
    }
  }
}
