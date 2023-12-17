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

    chat.on(Chat.Events.PRIVATE_MESSAGE, (message) => {
        console.log("Message received: ", message.message);
        messages.push(message);
        while (messages.length > limit) {
            messages.shift();
        }

        console.log("Scrolling to end", endDiv);
        endDiv?.scrollIntoView({block: "end"});
    });

    chat.on(Chat.Events.CLEAR_MESSAGE, (message) => {
        console.error("Clearing message: ", message);
    });

    onMount(async () => {
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
    {#each messages as message}
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

    .chat-end-marker {
        height: 1px;
        width: 1px;
    }

    .channel-list {
        width: 100%;
        background-color: rgba(0, 0, 0, 0.2);
    }
</style>