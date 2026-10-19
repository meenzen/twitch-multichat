<script lang="ts">
  import {
    MessagePartType,
    MessageType,
    type ParsedMessage,
  } from "#lib/chat/ChatMessage.ts";
  import TwitchEmote from "#lib/TwitchEmote.svelte";
  import TwitchUsername from "#lib/TwitchUsername.svelte";
  import FormattedMessage from "#lib/FormattedMessage.svelte";
  import { formatClock } from "#lib/chat/duration.ts";

  let {
    message,
    shadow = true,
    channelTag = true,
    timestamps = false,
  }: {
    message: ParsedMessage;
    shadow?: boolean;
    channelTag?: boolean;
    timestamps?: boolean;
  } = $props();
  let isAction = $derived(message.type === MessageType.Action);
</script>

<div class="message">
  {#if timestamps}
    <span class="timestamp">{formatClock(message.timestamp)}</span>
  {/if}
  <TwitchUsername {message} {shadow} {channelTag} />
  <FormattedMessage italicized={isAction}>
    {#each message.parts as part (part)}
      {#if part.type === MessagePartType.Text}
        <span class="message-text">{part.content}</span>
      {:else if part.type === MessagePartType.Emote}
        <TwitchEmote id={part.content} name={part.emoteName} />
      {:else if part.type === MessagePartType.Link}
        <a
          class="message-link"
          href={part.href}
          target="_blank"
          rel="noopener noreferrer nofollow">{part.content}</a
        >
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
  .timestamp {
    color: var(--muted-text-color);
    font-variant-numeric: tabular-nums;
  }
  .message-link {
    color: var(--link-color);
    text-decoration: none;
  }
  .message-link:hover,
  .message-link:focus-visible {
    text-decoration: underline;
  }
</style>
