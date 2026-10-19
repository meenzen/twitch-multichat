<script lang="ts">
  import Chat from "#lib/chat/Chat.svelte";
  import ChatScreen from "#lib/components/ChatScreen.svelte";
  import type { FakeChatSource } from "#lib/fake/FakeChatSource.ts";
  import { fontSizes } from "#lib/settings/ChatSettings.ts";
  import { Settings } from "#lib/settings/Settings.svelte.ts";

  let { source, channels }: { source: FakeChatSource; channels: string[] } =
    $props();

  const settings = new Settings();
</script>

<ChatScreen {channels} {settings}>
  <Chat
    {source}
    {channels}
    shadow={settings.values.shadow}
    channelTag={settings.values.channelTag}
    timestamps={settings.values.timestamps}
    fontSize={fontSizes[settings.values.fontSize]}
  />
</ChatScreen>
