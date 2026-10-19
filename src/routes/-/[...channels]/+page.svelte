<script lang="ts">
  import "@fontsource/inter";
  import "@fontsource/inter/700.css";
  import TwitchChat from "#lib/TwitchChat.svelte";
  import ChatScreen from "#lib/components/ChatScreen.svelte";
  import MetaTags from "#lib/components/MetaTags.svelte";
  import { ChannelFilter } from "#lib/chat/ChannelFilter.svelte.ts";
  import { Settings, persistInUrl } from "#lib/settings/Settings.svelte.ts";
  import { replaceUrl } from "#lib/settings/replaceUrl.ts";
  import { browser } from "$app/env";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";

  let { data = $bindable() } = $props();

  let selectedChannels = data.channels;
  let shouldConnect = selectedChannels.length > 0;
  const filter = new ChannelFilter(selectedChannels);
  const settings = new Settings(data.settings);
  $effect(() =>
    persistInUrl(settings, {
      replace: replaceUrl,
    }),
  );
  if (browser && shouldConnect) {
    console.log("Selected channels:", selectedChannels);
  }
</script>

<svelte:head>
  <!-- endless channel combinations, only the landing page is indexed -->
  <MetaTags url={page.url} channels={selectedChannels} noindex />
  <link rel="preload" as="image" href="/emote.png" />
</svelte:head>

{#if browser}
  {#if shouldConnect}
    <ChatScreen
      channels={data.channels}
      {filter}
      {settings}
      homeHref={resolve("/")}
    >
      <TwitchChat
        channels={data.channels}
        settings={settings.values}
        {filter}
      />
    </ChatScreen>
  {:else}
    <p class="alert">No valid channels selected</p>
  {/if}
{/if}

<style>
  .alert {
    font-size: var(--text-size);
    font-family: var(--font-family);
    width: 100%;
    text-align: center;
  }
</style>
