<script lang="ts">
    import type {PrivateMessages} from "twitch-js";

    const normalSpacer = ": ";
    const actionSpacer = " ";

    let {message, isAction} = $props<{ message: PrivateMessages, isAction: boolean }>();

    let c = "white";
    if ("color" in message.tags && message.tags.color) {
        c = message.tags.color;
    }
    
    let spacer = $state(isAction ? actionSpacer : normalSpacer);
    let color = $state(c);
    let username = $state(message.tags.displayName);
    let channel = $state(message.channel.substring(1));
</script>

<span class="channel-name message-text" style="color: white">[{channel}] </span>
<span class="username message-text" style="color: {color}">{username}</span><span class="message-text">{spacer}</span>

<style>
    .username {
        font-weight: bold;
    }
</style>