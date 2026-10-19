<script lang="ts">
  import Chat from "#lib/chat/Chat.svelte";
  import ChatScreen from "#lib/components/ChatScreen.svelte";
  import type { FakeChatSource } from "#lib/fake/FakeChatSource.ts";

  let { source, channels }: { source: FakeChatSource; channels: string[] } =
    $props();
</script>

<ChatScreen {channels}>
  <Chat {source} {channels} />
</ChatScreen>
