<script lang="ts">
  import ColorGenerator from "#lib/ColorGenerator.ts";

  let { channels }: { channels: string[] } = $props();
</script>

<!-- single row so it takes the same space for any number of channels;
     scrolls sideways when they don't fit -->
<ul class="channel-list">
  {#each channels as channel (channel)}
    <li style="color: {ColorGenerator.generate(channel)}">{channel}</li>
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
    scrollbar-width: thin;
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
</style>
