<script lang="ts">
  import "@fontsource/inter";
  import "@fontsource/inter/700.css";
  import TwitchChat from "#lib/TwitchChat.svelte";
  import ChatScreen from "#lib/components/ChatScreen.svelte";
  import MetaTags from "#lib/components/MetaTags.svelte";
  import { ChannelFilter } from "#lib/chat/ChannelFilter.svelte.ts";
  import {
    Settings,
    persistInUrl,
    saveOnChange,
  } from "#lib/settings/Settings.svelte.ts";
  import { replaceUrl } from "#lib/settings/replaceUrl.ts";
  import {
    initialSettings,
    saveSettings,
  } from "#lib/settings/savedSettings.ts";
  import { selectionHref } from "#lib/ChannelSelection.ts";
  import { addRecent } from "#lib/RecentChannels.ts";
  import { browserStorage } from "#lib/storage.ts";
  import { browser } from "$app/env";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";

  let { data = $bindable() } = $props();

  let selectedChannels = data.channels;
  let shouldConnect = selectedChannels.length > 0;
  const filter = new ChannelFilter(selectedChannels);
  const storage = browser ? browserStorage() : undefined;
  const settings = new Settings(
    browser ? initialSettings(page.url.searchParams, storage) : data.settings,
  );
  $effect(() =>
    persistInUrl(settings, {
      replace: replaceUrl,
    }),
  );
  $effect(() =>
    saveOnChange(settings, (values) => saveSettings(storage, values)),
  );
  if (browser && shouldConnect) {
    console.log("Selected channels:", selectedChannels);
    addRecent(storage, selectedChannels);
  }

  let homeHref = $derived(
    selectionHref(resolve("/"), selectedChannels, settings.values),
  );
</script>

<svelte:head>
  <!-- endless channel combinations, only the landing page is indexed -->
  <MetaTags url={page.url} channels={selectedChannels} noindex />
</svelte:head>

{#if browser}
  {#if shouldConnect}
    <ChatScreen channels={data.channels} {filter} {settings} {homeHref}>
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
