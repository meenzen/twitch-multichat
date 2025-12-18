<script lang="ts">
  import * as Sentry from "@sentry/sveltekit";
  import { ChatClient } from "@twurple/chat";
  import { onDestroy, onMount } from "svelte";
  import TwitchMessage from "$lib/TwitchMessage.svelte";
  import { dev } from "$app/environment";
  import ElementChecker from "$lib/ElementChecker";
  import LoadingMessage from "$lib/LoadingMessage.svelte";
  import type { ChatSettings } from "$lib/ChatSettings";
  import {
    MessageType,
    parseMessage,
    type ParsedMessage,
    type RawMessage,
  } from "./MessageParser";

  let { settings = $bindable() }: { settings: ChatSettings } = $props();

  let anchorVisible = $state(true);
  let bufferSize = $state(500);
  let maxBufferSize = $derived(bufferSize * 2);
  let currentBufferSize = $derived(anchorVisible ? bufferSize : maxBufferSize);

  let connectionError = $state(false);
  let loadingMessage = $state("");
  let messages = $state([] as ParsedMessage[]);
  let chatContainer = $state(null as HTMLDivElement | null);
  let anchor = $state(null as HTMLDivElement | null);
  let autoScrolled = false;
  let autoScrolledVerified = false;

  const chat = new ChatClient({
    logger: {
      minLevel: dev ? "INFO" : "WARNING",
    },
  });

  function updateAnchorVisibility() {
    anchorVisible = ElementChecker.isVisible(anchor);
  }

  function scrollToBottom() {
    console.log("Scrolling to bottom");
    anchor?.scrollIntoView({ behavior: "instant", block: "end" });
  }

  function autoScroll() {
    if (anchor == null) {
      return;
    }

    if (autoScrolledVerified) {
      return;
    }

    if (autoScrolled && anchorVisible) {
      console.log("Auto scroll finished");
      autoScrolledVerified = true;
    }

    if (!anchorVisible) {
      autoScrolled = true;
      scrollToBottom();
    }
  }

  function addMessage(message: RawMessage) {
    messages.push(parseMessage(message));
    updateAnchorVisibility();
    autoScroll();

    while (messages.length > currentBufferSize) {
      messages.shift();
    }

    console.debug({
      messages: messages.length,
      bufferSize: currentBufferSize,
      anchorVisible: anchorVisible,
    });

    Sentry.metrics.count("twitch_messages_received");
  }

  function deleteMessage(id: string) {
    let countBefore = messages.length;

    messages = messages.filter((message) => {
      return message.id.toLowerCase() !== id.toLowerCase();
    });

    let deleted = countBefore - messages.length;
    if (deleted > 0) {
      Sentry.metrics.count("twitch_messages_deleted", deleted);
    }
  }

  function deleteUserMessages(username: string) {
    let countBefore = messages.length;

    messages = messages.filter((message) => {
      return message.userName.toLowerCase() !== username.toLowerCase();
    });

    let deleted = countBefore - messages.length;
    if (deleted > 0) {
      Sentry.metrics.count("twitch_messages_deleted_user", deleted);
    }
  }

  function deleteChannelMessages(channel: string) {
    let countBefore = messages.length;

    messages = messages.filter((message) => {
      return message.target.toLowerCase() !== channel.toLowerCase();
    });

    let deleted = countBefore - messages.length;
    if (deleted > 0) {
      Sentry.metrics.count("twitch_messages_deleted_channel", deleted);
    }
  }

  function showLoadingMessage(message: string) {
    loadingMessage = message;

    if (loadingMessage.length > 0) {
      console.log(message);
    }
  }

  onMount(async () => {
    chat.onMessage((channel, user, text, msg) => {
      if (dev) {
        console.log("Message received:", { channel, user, text, msg });
      } else {
        console.debug("Message received:", { channel, user, text });
      }
      addMessage({ message: msg, type: MessageType.Normal });
    });

    chat.onAction((channel, user, text, msg) => {
      if (dev) {
        console.log("Action message received:", { channel, user, text, msg });
      } else {
        console.debug("Action message received:", { channel, user, text });
      }
      addMessage({ message: msg, type: MessageType.Action });
    });

    chat.onMessageRemove((channel, messageId) => {
      console.log("Clearing message:", { channel, messageId });
      deleteMessage(messageId);
    });

    chat.onChatClear((channel, msg) => {
      if (msg.targetUserId) {
        console.log("Clearing user:", { channel, userId: msg.targetUserId });
        // Get username from the user field in the message
        if (msg.user) {
          deleteUserMessages(msg.user);
        }
      } else {
        console.log("Clearing channel:", { channel });
        deleteChannelMessages(channel);
      }
    });

    showLoadingMessage("Connecting to Twitch...");
    try {
      chat.connect();
    } catch (error) {
      console.error("Failed to connect to Twitch:", error);
      connectionError = true;
    }

    for (const channel of settings.channels) {
      showLoadingMessage(`Joining: ${channel}...`);
      await chat.join(channel).catch((error) => {
        console.error("Failed to join channel:", error);
      });
    }

    Sentry.metrics.count("twitch_channels_joined", settings.channels.length);

    showLoadingMessage("");
  });

  onDestroy(() => {
    chat.quit();
  });
</script>

<div
  class="twitch-chat"
  role="button"
  tabindex="0"
  onclick={scrollToBottom}
  onkeydown={scrollToBottom}
  bind:this={chatContainer}
>
  {#each messages as message (message.id)}
    <TwitchMessage {message} bind:settings />
  {/each}

  <LoadingMessage bind:loadingMessage />

  {#if connectionError}
    <div class="error-message">
      <span class="message-text">Failed to connect to twitch chat.</span>
      <span class="message-text">Please try to refresh the page.</span>
    </div>
  {/if}

  <div class="chat-end-marker" bind:this={anchor}></div>
</div>

<style>
  .twitch-chat {
    overflow-y: auto;
    height: 100%;
    width: 100%;
    padding-left: 5px;
    padding-right: 5px;
    box-sizing: border-box;
    font-size: 13px;
  }

  .error-message {
    font-weight: 700;
    font-size: 20px;
    color: orangered;
    margin-top: 2px;
    margin-bottom: 5px;
    overflow-wrap: break-word;
  }

  /* https://css-tricks.com/books/greatest-css-tricks/pin-scrolling-to-bottom/ */
  :global(.twitch-chat *) {
    overflow-anchor: none;
  }

  :global(.chat-end-marker) {
    overflow-anchor: auto;
    height: 50px;
    margin-top: -50px;
    z-index: -100;
  }
</style>
