<script lang="ts">
    import type {PrivateMessages} from "twitch-js";
    import ColorGenerator from "$lib/ColorGenerator";
    import type {ChatSettings} from "$lib/ChatSettings";

    const normalSpacer = ":";
    const actionSpacer = "";

    let {message, isAction, settings = $bindable()} = $props<{
        message: PrivateMessages,
        isAction: boolean,
        settings: ChatSettings
    }>();

    let c = "white";
    if ("color" in message.tags && message.tags.color) {
        c = message.tags.color;
    }

    let spacer = $state(isAction ? actionSpacer : normalSpacer);
    let color = $state(c);
    let username = $state(message.tags.displayName);
    let channel = $state(message.channel.substring(1));
    let channelColor = $derived(ColorGenerator.generate(channel));
</script>

<span class:shadow={settings.shadow}>
    <span class="message-text channel-name" style="color: {channelColor}">[{channel}] </span>
    <span class="message-text username" style="color: {color}">{username}</span><span class="message-text">{spacer}</span>
</span>

<style>
    .username {
        font-weight: bold;
    }

    .shadow {
        --shadow-color: rgba(50, 50, 50, 0.5);
        text-shadow: 1px 0 1px var(--shadow-color), 0 1px 1px var(--shadow-color), -1px 0 1px var(--shadow-color), 0 -1px 1px var(--shadow-color);
    }
</style>
