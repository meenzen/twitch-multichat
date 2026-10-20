<script lang="ts">
  import ColorGenerator from "#lib/ColorGenerator.ts";
  import type { ChannelFilter } from "#lib/chat/ChannelFilter.svelte.ts";

  // Click a channel to show only that one, click more to add them back
  let { channels, filter }: { channels: string[]; filter?: ChannelFilter } =
    $props();
</script>

<!-- single row so it takes the same space for any number of channels;
     scrolls sideways when they don't fit -->
<ul class="channel-list">
  {#each channels as channel (channel)}
    {@const shown = filter?.isShown(channel) ?? true}
    {@const action = !filter?.active
      ? `Show only ${channel}`
      : shown
        ? `Hide ${channel}`
        : `Show ${channel}`}
    <li>
      {#if filter}
        <button
          type="button"
          class:hidden={!shown}
          style:color={shown ? ColorGenerator.generate(channel) : undefined}
          aria-pressed={filter.active && shown}
          title={action}
          onclick={() => filter.toggle(channel)}>{channel}</button
        >
      {:else}
        <span style:color={ColorGenerator.generate(channel)}>{channel}</span>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .channel-list {
    display: flex;
    gap: 1em;
    margin: 0;
    padding: 4px 8px;
    list-style: none;
    overflow-x: auto;
    /* standard scrollbar properties turn off the ::-webkit-scrollbar
       styles in app.html, so the colours have to be set here too */
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb-color) var(--scrollbar-color);
    white-space: nowrap;
    font-size: 18px;
    font-family: var(--font-family);
  }

  /* centered while it fits, scrollable from the first channel otherwise */
  li:first-child {
    margin-left: auto;
  }

  li:last-child {
    margin-right: auto;
  }

  button {
    font: inherit;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 1px solid var(--twitch-purple);
  }

  .hidden {
    color: var(--muted-text-color);
    text-decoration: line-through;
  }
</style>
