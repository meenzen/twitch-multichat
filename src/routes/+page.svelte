<script lang="ts">
    import "@fontsource/inter";
    import "@fontsource/inter/700.css";
    import {getRandomTwitchChannels} from "$lib/RandomTwitchChannels";

    let randomChannels = $state(getRandomTwitchChannels(3));
    let randomChannelsString = $derived(randomChannels.join("\n"));
    let channels = $state("");

    function getChannels() {
        return channels.split("\n").map(c => c.trim().toLowerCase());
    }

    function getUrl(channels: string) {
        let url = "/chat";
        let channelList = getChannels();

        if (channelList.length > 0) {
            url += "?channel=" + channelList.join("&channel=");
        }

        return url;
    }

    function isValid() {
        const channels = getChannels();

        if (channels.length < 1) {
            return false;
        }

        if (channels.some(c => c.length < 2)) {
            return false;
        }

        // channels must be alphanumeric or underscore, max 25 chars
        return !channels.some(c => !c.match(/^[a-z0-9_]{1,25}$/));
    }

    let link = $derived(getUrl(channels));
    let valid = $derived(isValid());
</script>

<svelte:head>
    <title>Twitch Multichat</title>
    <meta name="description" content="Combines multiple Twitch chats into one window.">
    <meta name="keywords" content="Twitch, chat, multichat">
</svelte:head>

<form>
    <textarea bind:value="{channels}" placeholder="{randomChannelsString}" rows="10" cols="50"/>

    {#if valid}
        <a href="{link}">Connect</a>
    {:else}
        <div class="placeholder">Enter at least one channel name</div>
    {/if}
</form>

<style>
    form {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        padding-left: 10px;
        padding-right: 10px;
    }

    textarea, a, .placeholder {
        font-family: "Inter", sans-serif;
        font-size: 1.5rem;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 0.5rem;
    }

    textarea {
        resize: none;
        margin-bottom: 1rem;
        width: 90%;
        max-width: 800px;
        text-align: center;
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