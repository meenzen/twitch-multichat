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

  it("stops listening after detach", () => {
    const { store, source, detach } = setup();
    detach();

    source.push(createMessage());

    expect(store.messages).toEqual([]);
  });
});
