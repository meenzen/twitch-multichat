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
    /** Text size in px, to pick sharp enough images */
    fontSize?: number;
  };

  let {
    id,
    name,
    images,
    heightScale = 1,
    fontSize = baseFontSize,
  }: Props = $props();

  let isTwitch = $derived(!images?.length);
  let sources = $derived(images?.length ? images : twitchEmoteImages(id));
  let srcset = $derived(emoteSrcset(sources, fontSize / baseFontSize));
</script>

<!-- Twitch emotes load with CORS: the service worker can only cache CORS
     responses. BetterTTV's CDN sends no CORS headers, a crossorigin image
     would fail; its long max-age leaves caching to the browser, like 7TV's. -->
<img
  src={sources[0].url}
  {srcset}
  alt={name}
  crossorigin={isTwitch ? "anonymous" : undefined}
  class="twitch-emote"
  style:--height-scale={heightScale === 1 ? undefined : heightScale}
/>

<style>
  img {
    /* 28px at the default 13px text, grows with the text size */
    height: calc(28em / 13 * var(--height-scale, 1));
    display: inline-block;
    /* centre on the text so the line grows evenly above and below it */
    vertical-align: middle;
  }
</style>
