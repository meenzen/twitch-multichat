<script lang="ts">
  import { ChatClient, type ChatMessage } from "@twurple/chat";
  import { onDestroy, onMount } from "svelte";
  import TwitchMessage from "$lib/TwitchMessage.svelte";
  import { dev } from "$app/environment";
  import ElementChecker from "$lib/ElementChecker";
  import LoadingMessage from "$lib/LoadingMessage.svelte";
  import type { ChatSettings } from "$lib/ChatSettings";

  let { settings = $bindable() }: { settings: ChatSettings } = $props();

  let anchorVisible = $state(true);
  let bufferSize = $state(500);
  let maxBufferSize = $derived(bufferSize * 2);
  let currentBufferSize = $derived(anchorVisible ? bufferSize : maxBufferSize);

  let connectionError = $state(false);
  let loadingMessage = $state("");
  let messages = $state([] as ChatMessage[]);
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

  function addMessage(message: ChatMessage) {
    messages.push(message);
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
  }

  function deleteMessage(id: string) {
    messages = messages.filter((message) => {
      return message.id.toLowerCase() !== id.toLowerCase();
    });
  }

  function deleteUserMessages(username: string) {
    messages = messages.filter((message) => {
      return message.userInfo.userName.toLowerCase() !== username.toLowerCase();
    });
  }

  function deleteChannelMessages(channel: string) {
    messages = messages.filter((message) => {
      return message.target.toLowerCase() !== channel.toLowerCase();
    });
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
      addMessage(msg);
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

    showLoadingMessage("");
  });

  onDestroy(async () => {
    await chat.quit();
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

  :global(.message-text) {
    white-space: pre-wrap;
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
