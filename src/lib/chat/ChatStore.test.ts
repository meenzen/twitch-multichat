import { describe, expect, it, mock } from "bun:test";
import { ChatStore } from "./ChatStore.svelte";
import { FakeChatSource } from "#lib/fake/FakeChatSource.ts";
import { createMessage } from "#lib/fake/fixtures.ts";

function setup(options: ConstructorParameters<typeof ChatStore>[0] = {}) {
  const store = new ChatStore(options);
  const source = new FakeChatSource();
  const detach = store.attach(source);
  return { store, source, detach };
}

describe("ChatStore", () => {
  it("collects messages from the source in order", () => {
    const { store, source } = setup();
    const a = createMessage({ text: "a" });
    const b = createMessage({ text: "b" });

    source.push(a, b);

    expect(store.messages).toEqual([a, b]);
  });

  it("drops the oldest messages beyond the buffer size", () => {
    const { store, source } = setup({ bufferSize: 3 });
    const messages = Array.from({ length: 5 }, (_, i) =>
      createMessage({ text: `${i}` }),
    );

    source.push(...messages);

    expect(store.messages).toEqual(messages.slice(2));
  });

  it("keeps twice the buffer while the user is scrolled up", () => {
    const { store, source } = setup({ bufferSize: 2 });
    store.following = false;

    source.push(...Array.from({ length: 6 }, () => createMessage()));
    expect(store.messages).toHaveLength(4);

    store.following = true;
    source.push(createMessage());
    expect(store.messages).toHaveLength(2);
  });

  it("removes a single message by id, case-insensitively", () => {
    const onRemove = mock();
    const { store, source } = setup({ onRemove });
    const keep = createMessage();
    const drop = createMessage({ id: "ABC-123" });
    source.push(keep, drop);

    source.remove("abc-123");

    expect(store.messages).toEqual([keep]);
    expect(onRemove).toHaveBeenCalledWith("message", 1);
  });

  it("clears a user only in the given channel", () => {
    const onRemove = mock();
    const { store, source } = setup({ onRemove });
    const banned = createMessage({ userName: "troll", channel: "one" });
    const sameUserElsewhere = createMessage({
      userName: "troll",
      channel: "two",
    });
    const other = createMessage({ userName: "nice", channel: "one" });
    source.push(banned, sameUserElsewhere, other);

    source.clearUser("#One", "Troll");

    expect(store.messages).toEqual([sameUserElsewhere, other]);
    expect(onRemove).toHaveBeenCalledWith("user", 1);
  });

  it("clears all messages of a channel", () => {
    const { store, source } = setup();
    const keep = createMessage({ channel: "two" });
    source.push(
      createMessage({ channel: "one" }),
      keep,
      createMessage({ channel: "one" }),
    );

    source.clearChannel("one");

    expect(store.messages).toEqual([keep]);
  });

  it("does not report removals when nothing matched", () => {
    const onRemove = mock();
    const { source } = setup({ onRemove });
    source.push(createMessage());

    source.remove("unknown");
    source.clearChannel("nowhere");

    expect(onRemove).not.toHaveBeenCalled();
  });

  it("tracks the connection status", async () => {
    const { store, source } = setup();
    expect(store.status).toEqual({ kind: "idle" });

    source.setStatus({ kind: "joining", channel: "foo" });
    expect(store.status).toEqual({ kind: "joining", channel: "foo" });

    await source.connect(["foo"]);
    expect(store.status).toEqual({ kind: "ready" });
  });

  it("marks the gap after the connection is back", () => {
    let now = 0;
    const { store, source } = setup({ now: () => now });
    const before = createMessage({ text: "before" });
    const after = createMessage({ text: "after" });
    source.push(before);

    now = 50_000;
    source.setStatus({ kind: "reconnecting", since: 10_000 });
    // a failed attempt doesn't move the start of the outage
    now = 60_000;
    source.setStatus({ kind: "reconnecting", since: 55_000 });
    expect(store.messages).toEqual([before]);

    now = 90_000;
    source.setStatus({ kind: "joining", channel: "foo" });
    source.setStatus({ kind: "ready" });
    source.push(after);

    expect(store.messages).toEqual([
      before,
      {
        kind: "disconnect",
        id: "disconnect-10000",
        since: 10_000,
        until: 90_000,
      },
      after,
    ]);
  });

  it("marks the gap before messages of channels rejoined first", () => {
    let now = 0;
    const { store, source } = setup({ now: () => now });
    source.setStatus({ kind: "reconnecting", since: 1_000 });

    now = 2_000;
    source.setStatus({ kind: "joining", channel: "foo" });
    const early = createMessage({ channel: "foo" });
    source.push(early);
    now = 3_000;
    source.setStatus({ kind: "joining", channel: "bar" });
    source.setStatus({ kind: "ready" });

    expect(store.messages).toEqual([
      { kind: "disconnect", id: "disconnect-1000", since: 1_000, until: 2_000 },
      early,
    ]);
  });

  it("falls back to the time the drop was reported", () => {
    let now = 5_000;
    const { store, source } = setup({ now: () => now });

    source.setStatus({ kind: "reconnecting" });
    now = 8_000;
    source.setStatus({ kind: "ready" });

    expect(store.messages).toEqual([
      { kind: "disconnect", id: "disconnect-5000", since: 5_000, until: 8_000 },
    ]);
  });

  it("merges drops without messages in between into one marker", () => {
    let now = 0;
    const { store, source } = setup({ now: () => now });

    source.setStatus({ kind: "reconnecting", since: 1_000 });
    now = 2_000;
    source.setStatus({ kind: "ready" });
    source.setStatus({ kind: "reconnecting", since: 3_000 });
    now = 4_000;
    source.setStatus({ kind: "ready" });

    expect(store.messages).toEqual([
      { kind: "disconnect", id: "disconnect-1000", since: 1_000, until: 4_000 },
    ]);
  });

  it("does not mark the first connect", async () => {
    const { store, source } = setup();

    source.setStatus({ kind: "connecting" });
    await source.connect(["foo"]);

    expect(store.messages).toEqual([]);
  });

  it("keeps markers when moderation removes messages", () => {
    const { store, source } = setup();
    source.push(createMessage({ channel: "foo" }));
    source.setStatus({ kind: "reconnecting" });
    source.setStatus({ kind: "ready" });

    source.clearChannel("foo");

    expect(store.messages).toHaveLength(1);
    expect(store.messages[0]).toMatchObject({ kind: "disconnect" });
  });

  it("stops listening after detach", () => {
    const { store, source, detach } = setup();
    detach();

    source.push(createMessage());

    expect(store.messages).toEqual([]);
  });
});
