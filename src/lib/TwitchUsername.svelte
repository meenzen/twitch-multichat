<script lang="ts">
    import type {PrivateMessages} from "twitch-js";

    const spacer = ": "

    let {message} = $props<{ message: PrivateMessages }>();

    let color = $state("white");
    if ("color" in message.tags && message.tags.color) {
        color = message.tags.color;
    }
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