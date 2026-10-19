<script lang="ts">
  type Props = {
    id: string;
    name?: string;
    animated?: boolean;
    dark?: boolean;
  };

  let { id, name, animated = true, dark = true }: Props = $props();

  let src = $state("/emote.png");

  $effect(() => {
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
