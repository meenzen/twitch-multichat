import type { SocketLike } from "./LiveSocket";

/** In-memory socket for tests: drive it with open(), receive() and drop() */
export class FakeSocket implements SocketLike {
  sent: unknown[] = [];
  closed = false;
  onopen: SocketLike["onopen"] = null;
  onmessage: SocketLike["onmessage"] = null;
  onclose: SocketLike["onclose"] = null;
  onerror: SocketLike["onerror"] = null;

  constructor(readonly url: string) {}

  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }

  close(): void {
    this.closed = true;
  }

  open(): void {
    this.onopen?.({});
  }

  receive(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  /** The connection was lost */
  drop(): void {
    this.onclose?.({});
  }
}

/** Creates FakeSockets and remembers them, newest last */
export function fakeSockets() {
  const sockets: FakeSocket[] = [];
  const create = (url: string) => {
    const socket = new FakeSocket(url);
    sockets.push(socket);
    return socket;
  };
  return { sockets, create, latest: () => sockets.at(-1)! };
}
