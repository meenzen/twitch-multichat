import { mount } from "svelte";
import { FakeChatSource } from "#lib/fake/FakeChatSource.ts";
import { randomMessages, seededRandom } from "#lib/fake/fixtures.ts";
import Harness from "./Harness.svelte";

// Browser entry for chat-scroll.test.ts: the real chat layout fed by a fake
// source that the test drives through window.chat.

const channels = ["channel1", "channel2", "channel3"];
const source = new FakeChatSource();
const random = seededRandom(42);

mount(Harness, {
  target: document.getElementById("app")!,
  props: { source, channels },
});

let streaming: ReturnType<typeof setInterval> | undefined;

const chat = {
  push(count = 1) {
    source.push(...randomMessages(count, random, channels));
  },
  /** Keeps messages coming, like a busy chat, until stopStream() */
  stream(perSecond: number) {
    clearInterval(streaming);
    streaming = setInterval(() => chat.push(), 1000 / perSecond);
  },
  stopStream() {
    clearInterval(streaming);
  },
};

Object.assign(window, { chat });
