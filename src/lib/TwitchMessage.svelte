<script lang="ts">
    import type {PrivateMessages} from "twitch-js";
    import {type MessagePart, MessagePartType, parseMessage} from "$lib/MessageParser";
    import TwitchEmote from "$lib/TwitchEmote.svelte";
    import {onMount} from "svelte";
    import TwitchUsername from "$lib/TwitchUsername.svelte";

    let {message} = $props<{ message: PrivateMessages }>();

    let parts = $state([] as MessagePart[]);

    onMount(() => {
        parts = parseMessage(message);
    });
</script>


<div class="message">
    <TwitchUsername message="{message}"/>
    {#each parts as part}
        {#if part.type === MessagePartType.Text}
            <span>{part.content}</span>
        {:else if part.type === MessagePartType.Emote}
            <TwitchEmote id="{part.content}" name="{part.emoteName}"/>
        {/if}
    {/each}
</div>

<style>
    .message {
        font-family: Inter, Roobert, "Helvetica Neue", Helvetica, Arial, sans-serif;
        align-items: center;
        margin-top: 2px;
        margin-bottom: 5px;
        overflow-wrap: break-word;
    }

    span {
        white-space: pre-wrap;
    }
</style>