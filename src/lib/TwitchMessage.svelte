<script lang="ts">
  import {
    MessagePartType,
    MessageType,
    type ParsedMessage,
  } from "$lib/MessageParser";
  import TwitchEmote from "$lib/TwitchEmote.svelte";
  import TwitchUsername from "$lib/TwitchUsername.svelte";
  import FormattedMessage from "$lib/FormattedMessage.svelte";
  import type { ChatSettings } from "$lib/ChatSettings";

  let {
    message,
    settings = $bindable(),
  }: { message: ParsedMessage; settings: ChatSettings } = $props();
  let isAction = $derived(message.type === MessageType.Action);
</script>

<div class="message">
  <TwitchUsername {message} bind:settings />
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
</style>
