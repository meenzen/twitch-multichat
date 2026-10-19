<script lang="ts">
  import type { Snippet } from "svelte";
  import TwitchChannelList from "#lib/TwitchChannelList.svelte";

  // Full-screen layout: channel list on top, the chat fills the rest. Only
  // the chat scrolls, so it can reliably stay pinned to the newest message.
  let { channels, children }: { channels: string[]; children: Snippet } =
    $props();
</script>

<div class="chat-screen">
  <TwitchChannelList {channels} />
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
