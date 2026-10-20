<script lang="ts">
  import "@fontsource/inter";
  import "@fontsource/inter/700.css";
  import { page } from "$app/state";
  import Chat from "#lib/chat/Chat.svelte";
  import ChatView from "#lib/chat/ChatView.svelte";
  import { ChannelFilter } from "#lib/chat/ChannelFilter.svelte.ts";
  import ChatScreen from "#lib/components/ChatScreen.svelte";
  import {
    fontSizes,
    hiddenEmoteProviders,
    parseSettings,
  } from "#lib/settings/ChatSettings.ts";
  import { Settings, persistInUrl } from "#lib/settings/Settings.svelte.ts";
  import { replaceUrl } from "#lib/settings/replaceUrl.ts";
  import { FakeChatSource } from "#lib/fake/FakeChatSource.ts";
  import {
    defaultChannels,
    randomMessages,
    seededRandom,
  } from "#lib/fake/fixtures.ts";

  // Layout playground, no Twitch connection involved.
  //   /dev/chat                      live stream of fake messages
  //   /dev/chat?static               fixed, reproducible message list
  //   ?rate=20                       messages per second (live)
  //   ?delete=0.1                    chance to delete a recent message (live)
  //   ?drop=10                       drop the connection for 3s every 10s (live)
  //   ?channels=a,b,c  ?seed=42  ?count=50
  //   plus the chat settings, e.g. ?shadow=false&size=large&overlay=true
  const params = page.url.searchParams;
  const isStatic = params.has("static");
  const channels = params.get("channels")?.split(",") ?? defaultChannels;
  const seed = Number(params.get("seed") ?? 1);

  const settings = new Settings(parseSettings(params));
  $effect(() =>
    persistInUrl(settings, {
      replace: replaceUrl,
    }),
  );
  let display = $derived({
    shadow: settings.values.shadow,
    channelTag: settings.values.channelTag,
    timestamps: settings.values.timestamps,
    fontSize: fontSizes[settings.values.fontSize],
    hiddenEmotes: hiddenEmoteProviders(settings.values),
  });

  const source = new FakeChatSource();
  const filter = new ChannelFilter(channels);
  if (!isStatic) {
    source.stream({
      rate: Number(params.get("rate") ?? 5),
      deleteChance: Number(params.get("delete") ?? 0),
    });
    const dropEvery = Number(params.get("drop") ?? 0);
    if (dropEvery > 0) {
      setInterval(() => source.drop(3000), dropEvery * 1000);
    }
  }

  const staticMessages = isStatic
    ? randomMessages(
        Number(params.get("count") ?? 50),
        seededRandom(seed),
        channels,
      )
    : [];
  let shownStaticMessages = $derived(
    staticMessages.filter((m) => filter.isShown(m.channel)),
  );
</script>

<ChatScreen {channels} {filter} {settings}>
  {#if isStatic}
    <ChatView messages={shownStaticMessages} {...display} />
  {:else}
    <Chat {source} {channels} {filter} {...display} />
  {/if}
</ChatScreen>
