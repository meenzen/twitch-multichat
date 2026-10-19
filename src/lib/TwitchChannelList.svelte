<script lang="ts">
  import ColorGenerator from "#lib/ColorGenerator.ts";
  import type { ChannelFilter } from "#lib/chat/ChannelFilter.svelte.ts";

  // Click a channel to show only that one, click more to add them back
  let { channels, filter }: { channels: string[]; filter: ChannelFilter } =
    $props();
</script>

<div class="channel-list">
  <table>
    <tbody>
      {#each channels as channel (channel)}
        {@const shown = filter.isShown(channel)}
        {@const action = !filter.active
          ? `Show only ${channel}`
          : shown
            ? `Hide ${channel}`
            : `Show ${channel}`}
        <tr>
          <td>
            <button
              type="button"
              class:hidden={!shown}
              style:color={shown ? ColorGenerator.generate(channel) : undefined}
              aria-pressed={filter.active && shown}
              title={action}
              onclick={() => filter.toggle(channel)}>{channel}</button
            >
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  table,
  tbody,
  td {
    width: 100%;
    text-align: center;
  }

  .channel-list {
    font-size: var(--text-size);
    font-family: var(--font-family);
    width: 100%;
  }

  button {
    font: inherit;
    background: none;
    border: none;
    padding: 0 4px;
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
