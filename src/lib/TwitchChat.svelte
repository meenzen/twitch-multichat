<script lang="ts">
    import {Chat, type PrivateMessages} from "twitch-js";
    import {onDestroy, onMount} from 'svelte';
    import TwitchMessage from "$lib/TwitchMessage.svelte";

    let limit = $state(100);
    let messages = $state([] as PrivateMessages[])
    let endDiv = $state(null as HTMLElement | null);
    let channels = $state(['the_red_doctor', 'cheshires_wonderland', 'kimmymode', 'jemima91']);

    const chat = new Chat({
        username: 'justinfan9999',
        log: {enabled: true, level: 'info'},
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

    onMount(async () => {
        chat.on(Chat.Events.PRIVATE_MESSAGE, (message) => {
            console.log("Message received:", message.message);
            addMessage(message);
        });

        chat.on(Chat.Events.CLEAR_MESSAGE, (message) => {
            console.warn("todo: clear message:", message);
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

<div class="channel-list">
    <table>
        <tbody>
        {#each channels as channel}
            <tr>
                <td>{channel}</td>
            </tr>
        {/each}
        </tbody>
    </table>
</div>

<div class="twitch-chat">
    {#each messages as message (message._raw)}
        <TwitchMessage {message}/>
    {/each}
    <div class="chat-end-marker" bind:this={endDiv}/>
</div>

<style>
    .twitch-chat {
        overflow-y: scroll;
        height: 100%;
        width: 100%;
        font-size: 13px;
    }

    .channel-list {
        width: 100%;
        background-color: rgba(0, 0, 0, 0.2);
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