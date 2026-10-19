<script lang="ts">
  import {
    MessagePartType,
    MessageType,
    type ParsedMessage,
  } from "#lib/chat/ChatMessage.ts";
  import TwitchEmote from "#lib/TwitchEmote.svelte";
  import TwitchUsername from "#lib/TwitchUsername.svelte";
  import FormattedMessage from "#lib/FormattedMessage.svelte";

  let { message, shadow = true }: { message: ParsedMessage; shadow?: boolean } =
    $props();
  let isAction = $derived(message.type === MessageType.Action);
</script>

<div class="message">
  <TwitchUsername {message} {shadow} />
  <FormattedMessage italicized={isAction}>
    {#each message.parts as part (part)}
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
  .message-text {
    white-space: pre-wrap;
  }
</style>
