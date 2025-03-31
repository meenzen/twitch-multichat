<script lang="ts">
  import ColorGenerator from "$lib/ColorGenerator";
  import type { ChatSettings } from "$lib/ChatSettings";

  let { settings = $bindable() }: { settings: ChatSettings } = $props();
</script>

<div class="channel-list">
  <table>
    <tbody>
      {#each settings.channels as channel (channel)}
        <tr>
          <td style="color: {ColorGenerator.generate(channel)}">{channel}</td>
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
</style>
