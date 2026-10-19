<script lang="ts">
  import type { Snippet } from "svelte";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import TwitchChannelList from "#lib/TwitchChannelList.svelte";
  import type { ChannelFilter } from "#lib/chat/ChannelFilter.svelte.ts";
  import { Settings } from "#lib/settings/Settings.svelte.ts";
  import SettingsDialog from "#lib/settings/SettingsDialog.svelte";

  // Full-screen layout: top bar with the channel list, the chat fills the
  // rest. Only the chat scrolls, so it can reliably stay pinned to the newest
  // message. In overlay mode (for streaming software) only the chat is shown,
  // on a transparent background.
  let {
    channels,
    filter,
    settings = new Settings(),
    homeHref = "/",
    settingsOpen = $bindable(false),
    children,
  }: {
    channels: string[];
    filter?: ChannelFilter;
    settings?: Settings;
    homeHref?: string;
    settingsOpen?: boolean;
    children: Snippet;
  } = $props();

  let overlay = $derived(settings.values.overlay);

  $effect(() => {
    document.documentElement.classList.toggle("overlay", overlay);
    return () => document.documentElement.classList.remove("overlay");
  });

  function onKeydown(event: KeyboardEvent) {
    if (
      event.key !== "Escape" ||
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      overlay
    ) {
      return;
    }
    // also keeps the dialog from closing itself, so `settingsOpen` stays the
    // single source of truth
    event.preventDefault();
    settingsOpen = !settingsOpen;
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="chat-screen" class:overlay>
  {#if !overlay}
    <header class="top-bar">
      <a
        class="icon-button"
        href={homeHref}
        aria-label="Back to channel selection"
        title="Back to channel selection"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </a>
      <div class="channels">
        <TwitchChannelList {channels} {filter} />
      </div>
      <button
        type="button"
        class="icon-button"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={settingsOpen}
        title="Settings (Esc)"
        onclick={() => (settingsOpen = !settingsOpen)}
      >
        <SettingsIcon size={20} aria-hidden="true" />
      </button>
    </header>
    <SettingsDialog {settings} bind:open={settingsOpen} />
  {/if}
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

  /* both buttons are the same size, so the channels stay centred */
  .top-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px;
  }

  .channels {
    flex: 1;
    min-width: 0;
  }

  .icon-button {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: none;
    color: var(--muted-text-color);
    cursor: pointer;
  }

  .icon-button:hover,
  .icon-button:focus-visible,
  .icon-button[aria-expanded="true"] {
    color: var(--text-color);
  }

  .icon-button:focus-visible {
    outline: 1px solid var(--twitch-purple);
  }

  .chat-area {
    flex: 1;
    min-height: 0;
  }

  :global(html.overlay),
  :global(html.overlay body) {
    background: transparent;
  }

  .overlay :global(*) {
    scrollbar-width: none;
  }

  .overlay :global(*::-webkit-scrollbar) {
    display: none;
  }
</style>
