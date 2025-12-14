<script lang="ts">
  import type { ChatMessage } from "@twurple/chat";
  import { isAction, MessagePartType, parseMessage } from "$lib/MessageParser";
  import TwitchEmote from "$lib/TwitchEmote.svelte";
  import TwitchUsername from "$lib/TwitchUsername.svelte";
  import FormattedMessage from "$lib/FormattedMessage.svelte";
  import type { ChatSettings } from "$lib/ChatSettings";

  let {
    message,
    settings = $bindable(),
  }: { message: ChatMessage; settings: ChatSettings } = $props();

  let parts = $derived(parseMessage(message));
  let isActionMessage = $derived(isAction(message));
</script>

<div class="message">
  <TwitchUsername {message} isAction={isActionMessage} bind:settings />
  <FormattedMessage italicized={isActionMessage}>
    {#each parts as part (part)}
      {#if part.type === MessagePartType.Text}
        <span class="message-text">{part.content}</span>
      {:else if part.type === MessagePartType.Emote}
        <TwitchEmote id={part.content} name={part.emoteName} />
      {/if}
    {/each}
  </FormattedMessage>
</div>

<style>
  .message {
    margin-top: 2px;
    margin-bottom: 5px;
    overflow-wrap: break-word;
  }
</style>
