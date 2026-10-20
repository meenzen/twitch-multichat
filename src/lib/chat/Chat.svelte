<script lang="ts">
  import { onMount } from "svelte";
  import ChatView from "./ChatView.svelte";
  import { ChatStore } from "./ChatStore.svelte";
  import type { ChatSource } from "./ChatSource";
  import type { ChannelFilter } from "./ChannelFilter.svelte";
  import { isMessage } from "./ChatMessage";

  // Connects any ChatSource to a ChatStore and renders it.
  let {
    source,
    channels,
    shadow = true,
    channelTag = true,
    timestamps = false,
    fontSize = 13,
    hiddenEmotes = [],
    store = new ChatStore(),
    filter,
  }: {
    source: ChatSource;
    channels: string[];
    shadow?: boolean;
    channelTag?: boolean;
    timestamps?: boolean;
    /** Text size in px */
    fontSize?: number;
    /** Third-party emote providers whose emotes show as text */
    hiddenEmotes?: readonly string[];
    store?: ChatStore;
    /** Hides channels; the store keeps their messages for when they return */
    filter?: ChannelFilter;
  } = $props();

  let messages = $derived(
    filter?.active
      ? // disconnects affect every channel, so markers always stay
        store.messages.filter((m) => !isMessage(m) || filter.isShown(m.channel))
      : store.messages,
  );

  onMount(() => {
    const detach = store.attach(source);
    source.connect(channels).catch((error) => {
      console.error("Failed to connect to chat:", error);
    });

    return () => {
      source.disconnect();
      detach();
    };
  });
</script>

<ChatView
  {messages}
  status={store.status}
  {shadow}
  {channelTag}
  {timestamps}
  {fontSize}
  {hiddenEmotes}
  bind:following={store.following}
/>
