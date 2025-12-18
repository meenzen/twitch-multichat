<script lang="ts">
  let { channels }: { channels: string[] } = $props();

  function buildImageUrl(channels: string[]): string {
    const baseUrl = "/images/preview.png";
    if (channels.length === 0) {
      return baseUrl;
    }
    const params = channels.map((ch) => `channel=${encodeURIComponent(ch)}`);
    return `${baseUrl}?${params.join("&")}`;
  }

  let hasChannels = $derived(channels.length > 0);
  let combinedChannels = $derived(channels.join(", "));
  let title = $derived(
    hasChannels ? `Twitch Multichat: ${combinedChannels}` : "Twitch Multichat",
  );
  let description =
    "Combine multiple Twitch chats into a single view — Seamless chat for collabs, multi-stream events or just your favorite streamers.";
  let imageAlt = $derived(
    hasChannels
      ? `Twitch Multichat preview for channels: ${combinedChannels}`
      : "Twitch Multichat preview",
  );
  let imageUrl = $derived(buildImageUrl(channels));
</script>

<title>{title}</title>
<meta name="description" content={description} />
<meta name="keywords" content="Twitch, chat, multichat" />

<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Twitch Multichat" />
{#if hasChannels}
  <meta property="og:image" content={imageUrl} />
  <meta property="og:image:alt" content={imageAlt} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
{/if}

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
{#if hasChannels}
  <meta name="twitter:image" content={imageUrl} />
  <meta name="twitter:image:alt" content={imageAlt} />
{/if}
