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
</script>

<span class="username" style="color: {color}">{message.username}</span><span>{spacer}</span>

<style>
    .username {
        font-weight: bold;
    }

    span {
        white-space: pre-wrap;
    }
</style>