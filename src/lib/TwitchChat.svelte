<script lang="ts">
    import {Chat, type PrivateMessages} from "twitch-js";
    import {onDestroy, onMount} from 'svelte';
    import TwitchMessage from "$lib/TwitchMessage.svelte";
    import {dev} from '$app/environment';
    import ElementChecker from "$lib/ElementChecker";

    let {channels} = $props<{ channels: string[] }>()

    let anchorVisible = $state(true);
    let bufferSize = $state(500);
    let maxBufferSize = $derived(bufferSize * 2);
    let currentBufferSize = $derived(anchorVisible ? bufferSize : maxBufferSize);

    let messages = $state([] as PrivateMessages[]);
    let chatContainer = $state(null as HTMLDivElement | null);
    let anchor = $state(null as HTMLDivElement | null);
    let autoScrollCount = $state(0);

    let logLevel = dev ? 'info' : 'warn';

    const chat = new Chat({
        username: 'justinfan9999',
        log: {enabled: true, level: logLevel},
        connectionTimeout: 1000 * 30,
        joinTimeout: 1000 * 30,
    });

    function updateAnchorVisibility() {
        anchorVisible = ElementChecker.isVisible(anchor);
    }
    
    function scrollToBottom() {
        console.log("scrolling to bottom");
        anchor?.scrollIntoView({behavior: "instant", block: "end"});
    }

    function clearMessages() {
        messages = [];
    }

    function addMessage(message: PrivateMessages) {
        messages.push(message);
        updateAnchorVisibility();
        
        if(anchor != null && !anchorVisible && autoScrollCount <= 4) {
            scrollToBottom();
            autoScrollCount++;
        }

        console.debug({"messages": messages.length, "bufferSize": currentBufferSize, "anchorVisible": anchorVisible});

        while (messages.length > currentBufferSize) {
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
                const messageUsername = message.username as string;
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

    onMount(async () => {
        chat.on(Chat.Events.PRIVATE_MESSAGE, (message) => {
            if (dev) {
                console.log("Message received:", message);
            } else {
                console.debug("Message received:", message);
            }
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
            if ("username" in message) {
                console.log("Clearing user:", message);
                const username = message.username as string;
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