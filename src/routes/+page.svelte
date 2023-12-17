<script lang="ts">
    import {Chat, type PrivateMessages} from "twitch-js";
    import {onDestroy, onMount} from 'svelte';
    import TwitchMessage from "$lib/TwitchMessage.svelte";
    
    let messages = $state([] as PrivateMessages[])
    
    const chat = new Chat({
        username: 'justinfan9999',
        log: { enabled: true, level: 'info' },
    });
    
    chat.on(Chat.Events.PRIVATE_MESSAGE, (message) => {
        console.log("Message received: ", message.message);
        messages.push(message);
    });
    
    onMount(async () => {
        await chat.connect();
        await chat.join('the_red_doctor');
    });
    
    onDestroy(async () => {
        await chat.disconnect();
    });
</script>

{#each messages as message}
    <TwitchMessage {message} />
{/each}

