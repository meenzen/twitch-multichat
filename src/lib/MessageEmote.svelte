<script lang="ts">
  import type { MessagePart } from "#lib/chat/ChatMessage.ts";
  import TwitchEmote from "#lib/TwitchEmote.svelte";

  // One emote of a message plus the zero-width emotes stacked on top of it.
  // Emotes of hidden providers show as their name instead.
  let {
    part,
    hiddenEmotes = [],
  }: {
    part: MessagePart;
    /** Third-party emote providers whose emotes show as text */
    hiddenEmotes?: readonly string[];
  } = $props();

  // Svelte trims whitespace at the edges of an element, but not expressions
  const space = " ";

  const isShown = (emote: MessagePart) =>
    !emote.emoteProvider || !hiddenEmotes.includes(emote.emoteProvider);

  let baseShown = $derived(isShown(part));
  let overlays = $derived((part.emoteOverlays ?? []).filter(isShown));
  let hiddenOverlays = $derived(
    (part.emoteOverlays ?? []).filter((o) => !isShown(o)),
  );
</script>

{#snippet image(emote: MessagePart)}
  <TwitchEmote id={emote.content} name={emote.emoteName} url={emote.emoteUrl} />
{/snippet}

{#if !baseShown}
  <span class="message-text">{part.emoteName}</span>
  <!-- nothing to stack on, the overlays stand on their own -->
  {#each overlays as overlay, i (i)}
    <span class="message-text">{space}</span>{@render image(overlay)}
  {/each}
{:else if overlays.length > 0}
  <span class="emote-stack">
    {@render image(part)}
    {#each overlays as overlay, i (i)}
      {@render image(overlay)}
    {/each}
  </span>
{:else}
  {@render image(part)}
{/if}
{#each hiddenOverlays as overlay, i (i)}
  <span class="message-text">{space}{overlay.emoteName}</span>
{/each}

<style>
  .message-text {
    white-space: pre-wrap;
  }

  /* all images in one grid cell, centred on each other */
  .emote-stack {
    display: inline-grid;
    place-items: center;
    vertical-align: middle;
  }
  .emote-stack > :global(*) {
    grid-area: 1 / 1;
  }
</style>
