<script lang="ts">
  type Props = {
    id: string;
    name?: string;
    /** Image of a third-party emote, Twitch emotes are found by id */
    url?: string;
    animated?: boolean;
    dark?: boolean;
  };

  let { id, name, url, animated = true, dark = true }: Props = $props();

  let src = $state("/emote.png");

  $effect(() => {
    if (url) {
      src = url;
      return;
    }
    const format = animated ? "default" : "static";
    const theme = dark ? "dark" : "light";
    const scale = "1.0";
    src = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/${format}/${theme}/${scale}`;
  });
</script>

<!-- Twitch emotes load with CORS: the service worker can only cache CORS
     responses. BetterTTV's CDN sends no CORS headers, a crossorigin image
     would fail; its long max-age leaves caching to the browser. -->
<img
  {src}
  alt={name}
  crossorigin={url ? undefined : "anonymous"}
  class="twitch-emote"
/>

<style>
  img {
    /* 28px at the default 13px text, grows with the text size */
    height: calc(28em / 13);
    display: inline-block;
    /* centre on the text so the line grows evenly above and below it */
    vertical-align: middle;
  }
</style>
