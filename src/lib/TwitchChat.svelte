<script lang="ts">
  import * as Sentry from "@sentry/sveltekit";
  import { dev } from "$app/env";
  import type { ChatSettings } from "#lib/ChatSettings.ts";
  import type { ChannelFilter } from "#lib/chat/ChannelFilter.svelte.ts";
  import Chat from "#lib/chat/Chat.svelte";
  import { ChatStore } from "#lib/chat/ChatStore.svelte.ts";
  import { TwitchChatSource } from "#lib/twitch/TwitchChatSource.ts";

  let { settings, filter }: { settings: ChatSettings; filter?: ChannelFilter } =
    $props();

  const source = new TwitchChatSource({ debug: dev });
  const store = new ChatStore({
    onRemove: (reason, count) => {
      const metric = {
        message: "twitch_messages_deleted",
        user: "twitch_messages_deleted_user",
        channel: "twitch_messages_deleted_channel",
      }[reason];
      Sentry.metrics.count(metric, count);
    },
  });

  source.on("message", () => Sentry.metrics.count("twitch_messages_received"));
  source.on("status", (status) => {
    if (status.kind === "ready") {
      Sentry.metrics.count("twitch_channels_joined", settings.channels.length);
    }
  });
</script>

<Chat
  {source}
  {store}
  {filter}
  channels={settings.channels}
  shadow={settings.shadow}
/>
