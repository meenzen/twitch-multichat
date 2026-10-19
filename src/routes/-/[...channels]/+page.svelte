<script lang="ts">
  import "@fontsource/inter";
  import "@fontsource/inter/700.css";
  import TwitchChat from "#lib/TwitchChat.svelte";
  import ChatScreen from "#lib/components/ChatScreen.svelte";
  import MetaTags from "#lib/components/MetaTags.svelte";
  import { browser } from "$app/env";

  let { data = $bindable() } = $props();

  let selectedChannels = data.channels;
  let shouldConnect = selectedChannels.length > 0;
  if (browser && shouldConnect) {
    console.log("Selected channels:", selectedChannels);
  }
</script>

<svelte:head>
  <MetaTags channels={selectedChannels} />
  <link rel="preload" as="image" href="/emote.png" />
</svelte:head>

{#if browser}
  {#if shouldConnect}
    <ChatScreen channels={data.channels}>
      <TwitchChat settings={data} />
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
