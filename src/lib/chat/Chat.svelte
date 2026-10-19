<script lang="ts">
  import { onMount } from "svelte";
  import ChatView from "./ChatView.svelte";
  import { ChatStore } from "./ChatStore.svelte";
  import type { ChatSource } from "./ChatSource";
  import type { ChannelFilter } from "./ChannelFilter.svelte";

  // Connects any ChatSource to a ChatStore and renders it.
  let {
    source,
    channels,
    shadow = true,
    store = new ChatStore(),
    filter,
  }: {
    source: ChatSource;
    channels: string[];
    shadow?: boolean;
    store?: ChatStore;
    /** Hides channels; the store keeps their messages for when they return */
    filter?: ChannelFilter;
  } = $props();

  let messages = $derived(
    filter?.active
      ? store.messages.filter((m) => filter.isShown(m.channel))
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
  bind:following={store.following}
/>
