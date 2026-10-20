<script lang="ts">
  import type { EmoteImage } from "#lib/emotes/Emote.ts";
  import {
    baseFontSize,
    emoteSrcset,
    twitchEmoteImages,
  } from "#lib/emotes/images.ts";

  type Props = {
    id: string;
    name?: string;
    /** Images of a third-party emote, Twitch emotes are found by id */
    images?: EmoteImage[];
    /** Height relative to a normal emote, for emotes made shorter */
    heightScale?: number;
    /** Width / height, to keep the right room while loading */
    aspectRatio?: number;
    /** Text size in px, to pick sharp enough images */
    fontSize?: number;
  };

  let {
    id,
    name,
    images,
    heightScale = 1,
    aspectRatio,
    fontSize = baseFontSize,
  }: Props = $props();

  let isTwitch = $derived(!images?.length);
  let sources = $derived(images?.length ? images : twitchEmoteImages(id));
  let srcset = $derived(emoteSrcset(sources, fontSize / baseFontSize));

  /** The image could not be loaded (deleted emote, CDN down, blocked) */
  let failed = $state(false);
</script>

{#if failed}
  <!-- the name reads better than the browser's broken image icon -->
  <span class="message-text">{name}</span>
{:else}
  <!-- Twitch emotes load with CORS: the service worker can only cache CORS
       responses. BetterTTV's CDN sends no CORS headers, a crossorigin image
       would fail; its long max-age leaves caching to the browser, like
       7TV's. -->
  <img
    src={sources[0].url}
    {srcset}
    alt={name}
    crossorigin={isTwitch ? "anonymous" : undefined}
    class="twitch-emote"
    style:--height-scale={heightScale === 1 ? undefined : heightScale}
    style:--aspect-ratio={aspectRatio}
    onerror={() => (failed = true)}
  />
{/if}

<style>
  img {
    /* 28px at the default 13px text, grows with the text size */
    height: calc(28em / 13 * var(--height-scale, 1));
    /* until the image is there: an empty box of its size (square unless
       the service says otherwise), so the text doesn't jump when it loads */
    aspect-ratio: auto var(--aspect-ratio, 1);
    display: inline-block;
    /* centre on the text so the line grows evenly above and below it */
    vertical-align: middle;
  }
  .message-text {
    white-space: pre-wrap;
  }
</style>
