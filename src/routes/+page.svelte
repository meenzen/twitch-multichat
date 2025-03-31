<script lang="ts">
    import "@fontsource/inter";
    import "@fontsource/inter/700.css";
    import TwitchChannel from "$lib/TwitchChannel";
    import {onMount} from "svelte";

    let randomChannels = $state([] as string[]);
    let randomChannelsString = $derived(randomChannels.join("\n"));
    let channels = $state("");

    function getChannels(channels: string) {
        return channels.split("\n")
            .map(c => c.trim().toLowerCase())
            .filter(c => c.length > 0);
    }

    function getUrl(channels: string) {
        let url = "/-/";
        let channelList = getChannels(channels);

        if (channelList.length > 0) {
            url += channelList.join("/");
        }

        return url;
    }

    function isValid(): boolean {
        let ch = getChannels(channels);

        if (ch.length === 0) {
            return false;
        }

        return TwitchChannel.isValidList(ch);
    }

    function feelingLucky() {
        const channelCount = Math.floor(Math.random() * 4) + 1;
        channels = TwitchChannel.getRandomList(channelCount).join("\n");
    }

    let link = $derived(getUrl(channels));
    let valid = $derived(isValid());

    onMount(() => {
        randomChannels = TwitchChannel.getRandomList(3);
    });
</script>

<svelte:head>
    <title>Twitch Multichat</title>
    <meta name="description" content="Combines multiple Twitch chats into one window.">
    <meta name="keywords" content="Twitch, chat, multichat">
</svelte:head>

<div class="container">

    <img src="/logo-512x512.png" alt="Twitch Multichat Logo" class="logo"/>

    <textarea bind:value="{channels}" placeholder="{randomChannelsString}" rows="10" cols="50"></textarea>
    {#if valid}
        <a href="{link}">Connect</a>
    {:else}
        <div class="placeholder">Connect</div>
    {/if}

    <a href="/" onclick="{feelingLucky}" style="margin-top: 15px">I'm feeling lucky</a>

</div>

<style>
    .logo {
        width: 256px;
        height: 256px;
        border-radius: 10%;
        margin-bottom: 20px;
    }

    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        padding: 20px;
        min-height: 80vh;
    }

    textarea, a, .placeholder {
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
</style>
