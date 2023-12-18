<script lang="ts">
    import {Chat, type PrivateMessages} from "twitch-js";
    import {onDestroy, onMount} from 'svelte';
    import TwitchMessage from "$lib/TwitchMessage.svelte";
    import { dev } from '$app/environment';

    let {channels} = $props<{ channels: string[] }>()

    let limit = $state(500);
    let messages = $state([] as PrivateMessages[]);
    let chatContainer = $state(null as HTMLDivElement | null);
    let anchor = $state(null as HTMLDivElement | null);
    
    let logLevel = dev ? 'info' : 'warn';

    const chat = new Chat({
        username: 'justinfan9999',
        log: {enabled: true, level: logLevel},
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

    function deleteUserMessages(username: string) {
        messages = messages.filter(message => {
            if ("username" in message) {
                const messageUsername = message.tags.username as string;
                return messageUsername.toLowerCase() !== username.toLowerCase();
            }

            return true;
        });
    }

    function deleteChannelMessages(channel: string) {
        messages = messages.filter(message => {
            if ("channel" in message) {
                const messageChannel = message.channel as string;
                return messageChannel.toLowerCase() !== channel.toLowerCase();
            }

            return true;
        });
    }

    function scrollToBottom() {
        console.log("scrolling to bottom");
        anchor?.scrollIntoView({behavior: "instant", block: "end"});
    }

    /** Detect if the chat window has enough content to be scrollable */
    function isScrollable() {
        const target = chatContainer;

        if (!target) {
            return false;
        }

        if (target.scrollHeight > target.clientHeight) {
            return true;
        }

        // if the chat window is taller than the screen, it's definitely scrollable
        // this happens when the chat window doesn't have a height set
        if (target.scrollHeight > window.innerHeight) {
            return true;
        }

        return false;
    }

    let autoScrolled = false;

    function autoScrollToBottom() {
        if (autoScrolled) {
            return;
        }

        if (isScrollable()) {
            console.log("auto scrolling to bottom");
            scrollToBottom();
            autoScrolled = true;
            return;
        }

        setTimeout(autoScrollToBottom, 250);
    }

    onMount(async () => {
        chat.on(Chat.Events.PRIVATE_MESSAGE, (message) => {
            console.log("Message received:", message.message);
            addMessage(message);
        });

        chat.on(Chat.Events.CLEAR_MESSAGE, (message) => {
            if ("targetMessageId" in message) {
                console.log("Clearing message:", message);
                const id = message.targetMessageId as string;
                deleteMessage(id);
            }
        });

        chat.on(Chat.Events.CLEAR_CHAT, (message) => {
            if ("user" in message) {
                console.log("Clearing user:", message);
                const username = message.user as string;
                deleteUserMessages(username);
            } else if ("channel" in message) {
                console.log("Clearing channel:", message);
                const channel = message.channel as string;
                deleteChannelMessages(channel);
            }
        });

        console.log("Connecting to twitch...");
        await chat.connect();
        for (const channel of channels) {
            console.log("Joining channel:", channel);
            await chat.join(channel);
        }
    });

    onDestroy(async () => {
        await chat.disconnect();
    });

    setTimeout(autoScrollToBottom, 250);
</script>

<div class="twitch-chat" role="button" tabindex="0" on:click={scrollToBottom} on:keydown={scrollToBottom}
     bind:this={chatContainer}>
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