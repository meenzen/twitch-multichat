<script lang="ts">
  import { siteDescription, siteName, type PageUrl } from "#lib/site.ts";

  // Title, description and link previews (OpenGraph, Twitter). Scrapers need
  // absolute URLs, so everything is built from `url` (see siteUrl for
  // prerendered pages). Render inside <svelte:head>.
  let {
    url,
    channels = [],
    noindex = false,
  }: {
    /** The current page, for absolute URLs */
    url: PageUrl;
    channels?: string[];
    /** Keep the page out of search results (link previews still work) */
    noindex?: boolean;
  } = $props();

  function imageUrl(origin: string, channels: string[]): string {
    const image = new URL("/images/preview.png", origin);
    for (const channel of channels) {
      image.searchParams.append("channel", channel);
    }
    return image.href;
  }

  let hasChannels = $derived(channels.length > 0);
  let combinedChannels = $derived(channels.join(", "));
  let title = $derived(
    hasChannels ? `${siteName}: ${combinedChannels}` : siteName,
  );
  let description = $derived(
    hasChannels
      ? `Chat of ${combinedChannels} combined into one view. ${siteDescription}`
      : siteDescription,
  );
  let imageAlt = $derived(
    hasChannels
      ? `${siteName} preview for channels: ${combinedChannels}`
      : `${siteName} preview`,
  );
  let image = $derived(imageUrl(url.origin, channels));
  // settings in the query string don't make a different page
  let canonical = $derived(new URL(url.pathname, url.origin).href);
</script>

<title>{title}</title>
<meta name="description" content={description} />
{#if noindex}
  <meta name="robots" content="noindex" />
{/if}
<link rel="canonical" href={canonical} />

<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content="website" />
<meta property="og:url" content={canonical} />
<meta property="og:site_name" content={siteName} />
<meta property="og:locale" content="en_US" />
<meta property="og:image" content={image} />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:alt" content={imageAlt} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={image} />
<meta name="twitter:image:alt" content={imageAlt} />
