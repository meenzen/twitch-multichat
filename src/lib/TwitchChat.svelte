<script lang="ts">
    import {Chat, type PrivateMessages} from "twitch-js";
    import {onDestroy, onMount} from 'svelte';
    import TwitchMessage from "$lib/TwitchMessage.svelte";

    let {channels} = $props<{channels: string[]}>()
    
    let limit = $state(500);
    let messages = $state([] as PrivateMessages[]);
    let anchor = $state(null as HTMLDivElement | null);

    const chat = new Chat({
        username: 'justinfan9999',
        log: {enabled: true, level: 'info'},
        connectionTimeout: 1000 * 30,
        joinTimeout: 1000 * 30,
    });

    function clearMessages() {
        messages = [];
    }

    function addMessage(message: PrivateMessages) {
        messages.push(message);
        while (messages.length > limit) {
            messages.shift();
        }
        messages = messages;
    }

    function deleteMessage(id: string) {
        messages = messages.filter(message => {
            if ("tags" in message && "id" in message.tags) {
                const messageId = message.tags.id as string;
                return messageId.toLowerCase() !== id.toLowerCase();
            }

            return true;
        });
    }

    function scrollToBottom() {
        console.log("scrolling to bottom");
        anchor?.scrollIntoView({behavior: "instant", block: "end"});
    }

    onMount(async () => {
        chat.on(Chat.Events.PRIVATE_MESSAGE, (message) => {
            console.log("Message received:", message.message);
            addMessage(message);
        });

        chat.on(Chat.Events.CLEAR_MESSAGE, (message) => {
            console.log("Clearing message:", message);

            if ("targetMessageId" in message) {
                const id = message.targetMessageId as string;
                deleteMessage(id);
            }
        });

        await chat.connect();
        for (const channel of channels) {
            await chat.join(channel);
        }
    });

    onDestroy(async () => {
        await chat.disconnect();
    });
</script>

<div class="twitch-chat" role="button" tabindex="0" on:click={scrollToBottom} on:keydown={scrollToBottom}>
    {#each messages as message (message._raw)}
        <TwitchMessage {message}/>
    {/each}
    <div class="chat-end-marker" bind:this={anchor}/>
</div>

<style>
    .twitch-chat {
        overflow-y: auto;
        height: 100%;
        width: 100%;
        padding-left: 5px;
        padding-right: 5px;
        box-sizing: border-box;
        font-size: 13px;
    }

    :global(.message-text) {
        white-space: pre-wrap;
    }

    /* https://css-tricks.com/books/greatest-css-tricks/pin-scrolling-to-bottom/ */
    :global(.twitch-chat *) {
        overflow-anchor: none;
    }

    :global(.chat-end-marker) {
        overflow-anchor: auto;
        height: 1px;
    }
</style>