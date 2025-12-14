<script lang="ts">
  import ColorGenerator from "$lib/ColorGenerator";
  import type { ChatSettings } from "$lib/ChatSettings";
  import { MessageType, type ParsedMessage } from "./MessageParser";

  const normalSpacer = ":";
  const actionSpacer = "";

  let {
    message,
    settings = $bindable(),
  }: {
    message: ParsedMessage;
    settings: ChatSettings;
  } = $props();

  let spacer = $derived(
    message.type === MessageType.Action ? actionSpacer : normalSpacer,
  );
  let color = $derived(message.userColor || "white");
  let username = $derived(message.displayName);
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
