<script lang="ts">
  import type { Snippet } from "svelte";
  import TwitchChannelList from "#lib/TwitchChannelList.svelte";
  import type { ChannelFilter } from "#lib/chat/ChannelFilter.svelte.ts";

  // Full-screen layout: channel list on top, the chat fills the rest. Only
  // the chat scrolls, so it can reliably stay pinned to the newest message.
  let {
    channels,
    filter,
    children,
  }: { channels: string[]; filter?: ChannelFilter; children: Snippet } =
    $props();
</script>

<div class="chat-screen">
  <TwitchChannelList {channels} {filter} />
  <div class="chat-area">
    {@render children()}
  </div>
</div>

<style>
  .chat-screen {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
  }

  .chat-area {
    flex: 1;
    min-height: 0;
  }
</style>
