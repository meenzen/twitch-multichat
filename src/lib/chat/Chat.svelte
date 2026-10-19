<script lang="ts">
  import { onMount } from "svelte";
  import ChatView from "./ChatView.svelte";
  import { ChatStore } from "./ChatStore.svelte";
  import type { ChatSource } from "./ChatSource";

  // Connects any ChatSource to a ChatStore and renders it.
  let {
    source,
    channels,
    shadow = true,
    store = new ChatStore(),
  }: {
    source: ChatSource;
    channels: string[];
    shadow?: boolean;
    store?: ChatStore;
  } = $props();

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
  messages={store.messages}
  status={store.status}
  {shadow}
  bind:following={store.following}
/>
