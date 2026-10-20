<script lang="ts">
  import "@fontsource/inter";
  import "@fontsource/inter/700.css";
  import X from "@lucide/svelte/icons/x";
  import TwitchChannel from "#lib/TwitchChannel.ts";
  import { readSelection } from "#lib/ChannelSelection.ts";
  import { loadRecent, removeRecent } from "#lib/RecentChannels.ts";
  import { browserStorage } from "#lib/storage.ts";
  import { onMount } from "svelte";
  import logo from "#lib/assets/logo.png?enhanced";
  import MetaTags from "#lib/components/MetaTags.svelte";
  import GitHubLink from "#lib/components/GitHubLink.svelte";
  import { siteName, siteUrl, structuredData } from "#lib/site.ts";
  import { building } from "$app/env";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";

  let randomChannels = $state([] as string[]);
  let randomChannelsString = $derived(randomChannels.join("\n"));
  let channels = $state("");
  // settings brought back from a chat (see ChannelSelection.ts); without
  // them the chat uses the saved settings
  let settingsQuery = $state("");
  let recent = $state.raw([] as string[][]);

  function getChannels(channels: string) {
    return channels
      .split("\n")
      .map((c) => c.trim().toLowerCase())
      .filter((c) => c.length > 0);
  }

  function getUrl(channels: string) {
    let channelList = getChannels(channels);
    let channelString = channelList.join("/");

    let url = resolve("/-/[...channels]", {
      channels: channelString,
    });

    return settingsQuery ? `${url}?${settingsQuery}` : url;
  }

  function isValid(): boolean {
    let ch = getChannels(channels);

    if (ch.length === 0) {
      return false;
    }

    return TwitchChannel.isValidList(ch);
  }

  async function feelingLucky() {
    const channelCount = Math.floor(Math.random() * 4) + 1;
    channels = (await TwitchChannel.getRandomList(channelCount)).join("\n");
  }

  // prerendered, see siteUrl
  const url = siteUrl(page.url, building);
  // split so the closing tag does not end this component's own <script>
  const jsonLd = `<script type="application/ld+json">${structuredData(url.origin)}<${"/"}script>`;

  let link = $derived(getUrl(channels));
  let valid = $derived(isValid());

  onMount(async () => {
    // prerendered, so the query is only known in the browser
    const selection = readSelection(
      new URLSearchParams(window.location.search),
    );
    if (selection.channels.length > 0) {
      channels = selection.channels.join("\n");
    }
    settingsQuery = selection.settingsQuery;
    recent = loadRecent(browserStorage());
    randomChannels = await TwitchChannel.getRandomList(3);
  });
</script>

<svelte:head>
  <MetaTags {url} />
  <!-- eslint-disable-next-line svelte/no-at-html-tags (static, escaped JSON) -->
  {@html jsonLd}
  <link rel="preconnect" href="https://mnzn.dev" />
</svelte:head>

<!-- full height: the content is centred in the space above the footer,
     the footer sits at the bottom -->
<div class="page">
  <div class="container">
    <enhanced:img src={logo} fetchpriority="high" alt="" class="logo" />

    <h1>{siteName}</h1>
    <p class="intro">
      Combine the chats of multiple Twitch channels into one view. Enter one
      channel per line.
    </p>

    <textarea
      bind:value={channels}
      aria-label="Channels, one per line"
      placeholder={randomChannelsString}
      rows="10"
      cols="50"></textarea>
    {#if valid}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href={link}>Connect</a>
    {:else}
      <div class="placeholder">Connect</div>
    {/if}

    <a href={resolve("")} onclick={feelingLucky} style="margin-top: 15px"
      >I'm feeling lucky</a
    >

    {#if recent.length > 0}
      <section class="recent" aria-labelledby="recent-title">
        <h2 id="recent-title">Recent</h2>
        <ul>
          {#each recent as list (list.join(","))}
            {@const name = list.join(", ")}
            <li>
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve (getUrl resolves) -->
              <a href={getUrl(list.join("\n"))}>{name}</a>
              <button
                type="button"
                aria-label={`Remove ${name} from recent`}
                title="Remove"
                onclick={() => (recent = removeRecent(browserStorage(), list))}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>

  <footer>
    <GitHubLink />
  </footer>
</div>

<style>
  .logo {
    width: 256px;
    height: 256px;
    border-radius: 10%;
    margin-bottom: 20px;
  }

  /* keep everything on one screen on laptops */
  @media (max-height: 900px) {
    .logo {
      width: 160px;
      height: 160px;
    }
  }

  h1 {
    margin: 0 0 0.5rem;
    font-family: "Inter", sans-serif;
    font-size: 2rem;
  }

  .intro {
    margin: 0 0 1.5rem;
    max-width: 26rem;
    font-family: "Inter", sans-serif;
    font-size: 1rem;
    line-height: 1.5;
    text-align: center;
    /* --muted-text-color is too dark for body text */
    color: color-mix(in srgb, var(--text-color) 75%, var(--background-color));
  }

  .page {
    --footer-height: 48px;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
  }

  /* as tall as the footer, so the content is centred on the whole page */
  .page::before {
    content: "";
    flex: none;
    height: var(--footer-height);
  }

  /* short screens (phones): fitting on one screen beats exact centring */
  @media (max-height: 800px) {
    .page::before {
      display: none;
    }
  }

  .container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 20px;
  }

  textarea,
  a,
  .placeholder {
    font-family: "Inter", sans-serif;
    font-size: 1.5rem;
    padding: 1rem;
    border: 1px solid var(--twitch-purple);
    border-radius: 0.5rem;
  }

  textarea:focus {
    outline-color: var(--twitch-purple);
  }

  textarea {
    resize: none;
    margin-bottom: 1rem;
    width: 90%;
    height: 120px;
    max-width: 300px;
    text-align: center;
    background-color: var(--background-color);
    color: var(--twitch-purple);
  }

  a {
    text-decoration: none;
    color: var(--text-color);
    background-color: var(--twitch-purple);
  }

  .placeholder {
    color: var(--text-color);
  }

  .recent {
    margin-top: 1.5rem;
    width: 90%;
    max-width: 300px;
    font-family: "Inter", sans-serif;
  }

  .recent h2 {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
    font-weight: normal;
    text-align: center;
    color: var(--muted-text-color);
  }

  .recent ul {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .recent li {
    display: flex;
    border: 1px solid var(--twitch-purple);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .recent a {
    flex: 1;
    min-width: 0;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 0;
    font-size: 1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-color);
    background-color: transparent;
  }

  .recent a:hover,
  .recent a:focus-visible {
    background-color: var(--twitch-purple);
  }

  .recent button {
    display: flex;
    align-items: center;
    padding: 0 0.625rem;
    border: none;
    color: var(--muted-text-color);
    background: none;
    cursor: pointer;
  }

  .recent button:hover,
  .recent button:focus-visible {
    color: var(--text-color);
  }

  .recent :focus-visible {
    outline: 2px solid var(--text-color);
    outline-offset: -2px;
  }

  footer {
    display: flex;
    flex: none;
    justify-content: center;
    align-items: flex-start;
    box-sizing: border-box;
    height: var(--footer-height);
    padding: 0 20px;
  }
</style>
