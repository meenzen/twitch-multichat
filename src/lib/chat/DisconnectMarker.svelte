<script lang="ts">
  import type { DisconnectEntry } from "./ChatMessage";
  import { formatDuration } from "./duration";

  // Divider where messages are missing because the chat was not connected
  let { entry }: { entry: DisconnectEntry } = $props();

  let duration = $derived(formatDuration(entry.until - entry.since));
  let range = $derived(
    `${new Date(entry.since).toLocaleTimeString()} – ${new Date(entry.until).toLocaleTimeString()}`,
  );
</script>

<div class="disconnect-marker" role="separator" title={range}>
  <span class="label">Disconnected for {duration}</span>
</div>

<style>
  .disconnect-marker {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0;
    color: var(--twitch-purple);
    font-weight: 700;
  }

  .disconnect-marker::before,
  .disconnect-marker::after {
    content: "";
    flex: 1;
    border-top: 1px solid var(--twitch-purple);
  }

  .label {
    white-space: nowrap;
  }
</style>
