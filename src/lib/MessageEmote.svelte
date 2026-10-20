<script lang="ts">
  import type { MessagePart } from "#lib/chat/ChatMessage.ts";
  import TwitchEmote from "#lib/TwitchEmote.svelte";

  // One emote of a message plus the zero-width emotes stacked on top of it.
  // Emotes of hidden providers show as their name instead.
  let {
    part,
    hiddenEmotes = [],
    fontSize,
  }: {
    part: MessagePart;
    /** Third-party emote providers whose emotes show as text */
    hiddenEmotes?: readonly string[];
    /** Text size in px */
    fontSize?: number;
  } = $props();

  /** Text, or images drawn on top of each other (just one: no stack) */
  type Piece = { text: string } | { images: MessagePart[] };

  const isShown = (emote: MessagePart) =>
    !emote.emoteProvider || !hiddenEmotes.includes(emote.emoteProvider);

  // Rendered by a single #each: whitespace between top-level blocks would
  // show up as extra spaces next to the message's own.
  let pieces = $derived.by((): Piece[] => {
    const overlays = part.emoteOverlays ?? [];
    const shown = overlays.filter(isShown);
    const hidden = overlays
      .filter((o) => !isShown(o))
      .map((o) => ({ text: ` ${o.emoteName}` }));

    if (isShown(part)) return [{ images: [part, ...shown] }, ...hidden];
    // nothing to stack on, the overlays stand on their own
    return [
      { text: part.emoteName ?? "" },
      ...shown.flatMap((o) => [{ text: " " }, { images: [o] }]),
      ...hidden,
    ];
  });
</script>

{#snippet image(emote: MessagePart)}
  <TwitchEmote
    id={emote.content}
    name={emote.emoteName}
    images={emote.emoteImages}
    heightScale={emote.emoteHeightScale}
    aspectRatio={emote.emoteAspectRatio}
    {fontSize}
  />
{/snippet}

{#each pieces as piece, i (i)}
  {#if "text" in piece}
    <span class="message-text">{piece.text}</span>
  {:else if piece.images.length > 1}
    <span class="emote-stack">
      {#each piece.images as emote, j (j)}
        {@render image(emote)}
      {/each}
    </span>
  {:else}
    {@render image(piece.images[0])}
  {/if}
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
