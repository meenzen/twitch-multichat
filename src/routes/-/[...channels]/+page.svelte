<script lang="ts">
  import "@fontsource/inter";
  import "@fontsource/inter/700.css";
  import TwitchChat from "$lib/TwitchChat.svelte";
  import TwitchChannelList from "$lib/TwitchChannelList.svelte";
  import MetaTags from "$lib/components/MetaTags.svelte";

  let { data = $bindable() } = $props();

  let selectedChannels = data.channels;
  let shouldConnect = selectedChannels.length > 0;
  if (shouldConnect) {
    console.log("Selected channels:", selectedChannels);
  }
</script>

<svelte:head>
  <MetaTags channels={selectedChannels} />
  <link rel="preload" as="image" href="/emote.png" />
</svelte:head>

{#if shouldConnect}
  <TwitchChannelList bind:settings={data} />
  <TwitchChat bind:settings={data} />
{:else}
  <p class="alert">No valid channels selected</p>
{/if}

<style>
  .alert {
    font-size: var(--text-size);
    font-family: var(--font-family);
    width: 100%;
    text-align: center;
  }
</style>
