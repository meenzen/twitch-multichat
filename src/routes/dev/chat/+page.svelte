<script lang="ts">
  import "@fontsource/inter";
  import "@fontsource/inter/700.css";
  import { page } from "$app/state";
  import Chat from "#lib/chat/Chat.svelte";
  import ChatView from "#lib/chat/ChatView.svelte";
  import { ChannelFilter } from "#lib/chat/ChannelFilter.svelte.ts";
  import ChatScreen from "#lib/components/ChatScreen.svelte";
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
  //   ?channels=a,b,c  ?shadow=false ?seed=42  ?count=50
  const params = page.url.searchParams;
  const isStatic = params.has("static");
  const channels = params.get("channels")?.split(",") ?? defaultChannels;
  const shadow = params.get("shadow") !== "false";
  const seed = Number(params.get("seed") ?? 1);

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

<ChatScreen {channels} {filter}>
  {#if isStatic}
    <ChatView messages={shownStaticMessages} {shadow} />
  {:else}
    <Chat {source} {channels} {shadow} {filter} />
  {/if}
</ChatScreen>
