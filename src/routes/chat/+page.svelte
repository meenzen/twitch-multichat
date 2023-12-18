<script lang="ts">
    import "@fontsource/inter";
    import "@fontsource/inter/700.css";
    import TwitchChat from "$lib/TwitchChat.svelte";
    import TwitchChannelList from "$lib/TwitchChannelList.svelte";

    let searchParams = new URLSearchParams(window.location.search);
    let selectedChannels = searchParams.getAll("channel");
    let shouldConnect = selectedChannels.length > 0;
    if (shouldConnect) {
        console.log("Connecting to channels:", selectedChannels);
    }
</script>

{#if shouldConnect}
    <TwitchChannelList channels="{selectedChannels}"/>
    <TwitchChat channels="{selectedChannels}"/>
{:else}
    <p class="alert">No channels selected</p>
{/if}

<style>
    .alert {
        font-size: var(--text-size);
        font-family: var(--font-family);
        width: 100%;
        text-align: center;
    }
</style>
