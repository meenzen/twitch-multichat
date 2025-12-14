<script lang="ts">
  import type { ChatMessage } from "@twurple/chat";
  import ColorGenerator from "$lib/ColorGenerator";
  import type { ChatSettings } from "$lib/ChatSettings";

  const normalSpacer = ":";
  const actionSpacer = "";

  let {
    message,
    isAction,
    settings = $bindable(),
  }: {
    message: ChatMessage;
    isAction: boolean;
    settings: ChatSettings;
  } = $props();

  let spacer = $derived(isAction ? actionSpacer : normalSpacer);
  let color = $derived(message.userInfo.color || "white");
  let username = $derived(message.userInfo.displayName);
  let channel = $derived(message.target.substring(1));
  let channelColor = $derived(ColorGenerator.generate(channel));
</script>

<span class:shadow={settings.shadow}>
  <span class="message-text channel-name" style="color: {channelColor}"
    >[{channel}]
  </span>
  <span class="message-text username" style="color: {color}">{username}</span
  ><span class="message-text">{spacer}</span>
</span>

<style>
  .username {
    font-weight: bold;
  }

  .shadow {
    --shadow-color: rgba(50, 50, 50, 0.5);
    text-shadow:
      1px 0 1px var(--shadow-color),
      0 1px 1px var(--shadow-color),
      -1px 0 1px var(--shadow-color),
      0 -1px 1px var(--shadow-color);
  }
</style>
