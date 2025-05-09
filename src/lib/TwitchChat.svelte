<script lang="ts">
  import { Chat, type PrivateMessages } from "twitch-js";
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
  let messages = $state([] as PrivateMessages[]);
  let chatContainer = $state(null as HTMLDivElement | null);
  let anchor = $state(null as HTMLDivElement | null);
  let autoScrolled = false;
  let autoScrolledVerified = false;

  let logLevel = dev ? "info" : "warn";

  const chat = new Chat({
    username: "justinfan9999",
    log: { enabled: true, level: logLevel },
    connectionTimeout: 1000 * 30,
    joinTimeout: 1000 * 30,
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

  function addMessage(message: PrivateMessages) {
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
      if ("tags" in message && "id" in message.tags) {
        const messageId = message.tags.id as string;
        return messageId.toLowerCase() !== id.toLowerCase();
      }

      return true;
    });
  }

  function deleteUserMessages(username: string) {
    messages = messages.filter((message) => {
      if ("username" in message) {
        const messageUsername = message.username as string;
        return messageUsername.toLowerCase() !== username.toLowerCase();
      }

      return true;
    });
  }

  function deleteChannelMessages(channel: string) {
    messages = messages.filter((message) => {
      if ("channel" in message) {
        const messageChannel = message.channel as string;
        return messageChannel.toLowerCase() !== channel.toLowerCase();
      }

      return true;
    });
  }

  function showLoadingMessage(message: string) {
    loadingMessage = message;

    if (loadingMessage.length > 0) {
      console.log(message);
    }
  }

  onMount(async () => {
    chat.on(Chat.Events.PRIVATE_MESSAGE, (message) => {
      if (dev) {
        console.log("Message received:", message);
      } else {
        console.debug("Message received:", message);
      }
      addMessage(message);
    });

    chat.on(Chat.Events.CLEAR_MESSAGE, (message) => {
      if ("targetMessageId" in message) {
        console.log("Clearing message:", message);
        const id = message.targetMessageId as string;
        deleteMessage(id);
      }
    });

    chat.on(Chat.Events.CLEAR_CHAT, (message) => {
      if ("username" in message) {
        console.log("Clearing user:", message);
        const username = message.username as string;
        deleteUserMessages(username);
      } else if ("channel" in message) {
        console.log("Clearing channel:", message);
        const channel = message.channel as string;
        deleteChannelMessages(channel);
      }
    });

    showLoadingMessage("Connecting to Twitch...");
    await chat.connect().catch((error) => {
      console.error("Failed to connect to Twitch:", error);
      connectionError = true;
    });

    for (const channel of settings.channels) {
      showLoadingMessage(`Joining: ${channel}...`);
      await chat.join(channel).catch((error) => {
        console.error("Failed to join channel:", error);
      });
    }

    showLoadingMessage("");
  });

  onDestroy(async () => {
    await chat.disconnect();
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
  {#each messages as message (message._raw)}
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
