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

<img {src} alt={name} class="twitch-emote" />

<style>
  img {
    /* 28px at the default 13px text, grows with the text size */
    height: calc(28em / 13);
    display: inline-block;
    /* centre on the text so the line grows evenly above and below it */
    vertical-align: middle;
  }
</style>
