<script lang="ts">
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
  let isReconnecting = $state(false);
  let loadingMessage = $state("");
  let messages = $state([] as ParsedMessage[]);
  let chatContainer = $state(null as HTMLDivElement | null);
  let anchor = $state(null as HTMLDivElement | null);
  let autoScrolled = false;
  let autoScrolledVerified = false;
  let reconnectAttempts = $state(0);
  let maxReconnectAttempts = 5;
  let reconnectDelay = 2000; // Start with 2 seconds

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
  }

  function deleteMessage(id: string) {
    messages = messages.filter((message) => {
      return message.id.toLowerCase() !== id.toLowerCase();
    });
  }

  function deleteUserMessages(username: string) {
    messages = messages.filter((message) => {
      return message.userName.toLowerCase() !== username.toLowerCase();
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

  async function reconnectToChat() {
    if (isReconnecting) {
      console.log("Already attempting to reconnect");
      return;
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error("Max reconnect attempts reached");
      connectionError = true;
      isReconnecting = false;
      return;
    }

    isReconnecting = true;
    reconnectAttempts++;
    const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1); // Exponential backoff

    console.log(
      `Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts}) in ${delay}ms...`,
    );
    showLoadingMessage(
      `Reconnecting... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`,
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      console.log("Reconnecting to Twitch...");
      await chat.reconnect();

      // Wait a moment for the connection to fully establish
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Rejoin all channels
      for (const channel of settings.channels) {
        console.log(`Rejoining channel: ${channel}`);
        await chat.join(channel).catch((error) => {
          console.error(`Failed to rejoin channel ${channel}:`, error);
        });
      }

      console.log("Successfully reconnected");
      reconnectAttempts = 0; // Reset on success
      isReconnecting = false;
      connectionError = false;
      showLoadingMessage("");
    } catch (error) {
      console.error("Failed to reconnect:", error);
      isReconnecting = false;
      // Don't retry recursively - let the disconnect event or visibility change trigger the next attempt
    }
  }

  onMount(() => {
    chat.onConnect(() => {
      console.log("Connected to Twitch chat");
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      connectionError = false;
      isReconnecting = false;
    });

    chat.onDisconnect((manually, reason) => {
      console.log("Disconnected from Twitch chat", { manually, reason });
      
      // Only auto-reconnect if the disconnect was not manual
      if (!manually) {
        console.log("Unexpected disconnect, attempting to reconnect...");
        reconnectToChat();
      }
    });

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

    // Listen for page visibility changes (e.g., phone wake/sleep)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Page became visible");
        // If we're not connected and not already reconnecting, try to reconnect
        // Check if we had a connection issue (connectionError or failed attempts) 
        if (!isReconnecting && connectionError) {
          console.log("Page visible after disconnect, attempting reconnect...");
          reconnectToChat();
        }
      } else {
        console.log("Page became hidden");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initialize connection asynchronously
    (async () => {
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
    })();

    // Cleanup visibility change listener
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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

  {#if isReconnecting}
    <div class="reconnecting-message">
      <span class="message-text">Reconnecting to Twitch chat...</span>
      <span class="message-text"
        >(attempt {reconnectAttempts}/{maxReconnectAttempts})</span
      >
    </div>
  {/if}

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

  .reconnecting-message {
    font-weight: 700;
    font-size: 18px;
    color: #ffa500;
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
