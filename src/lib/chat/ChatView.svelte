<script lang="ts">
  import TwitchMessage from "#lib/TwitchMessage.svelte";
  import Modal from "#lib/components/modal/Modal.svelte";
  import ElementChecker from "#lib/ElementChecker.ts";
  import type { ParsedMessage } from "./ChatMessage";
  import type { ChatStatus } from "./ChatSource";

  // Pure presentation: renders whatever messages it is given. All data comes
  // in through props, so layouts can be iterated on with fixture data.
  let {
    messages,
    status = { kind: "ready" },
    shadow = true,
    autoScroll = true,
    following = $bindable(true),
  }: {
    messages: ParsedMessage[];
    status?: ChatStatus;
    shadow?: boolean;
    /** Scroll to the newest message on load. Disable for embedded previews. */
    autoScroll?: boolean;
    following?: boolean;
  } = $props();

  let anchor = $state(null as HTMLDivElement | null);
  let autoScrolled = false;
  let autoScrolledVerified = false;

  let loadingMessage = $derived.by(() => {
    switch (status.kind) {
      case "connecting":
        return "Connecting to Twitch...";
      case "joining":
        return `Joining: ${status.channel}...`;
      case "reconnecting":
        return "Reconnecting...";
      default:
        return "";
    }
  });

  function updateAnchorVisibility() {
    following = ElementChecker.isVisible(anchor);
  }

  function scrollToBottom() {
    anchor?.scrollIntoView({ behavior: "instant", block: "end" });
  }

  function initialScroll() {
    if (!autoScroll || anchor == null || autoScrolledVerified) {
      return;
    }

    if (autoScrolled && following) {
      autoScrolledVerified = true;
    }

    if (!following) {
      autoScrolled = true;
      scrollToBottom();
    }
  }

  $effect(() => {
    // re-run after every change of the message list has been rendered
    void messages;
    updateAnchorVisibility();
    initialScroll();
  });
</script>

<div
  class="twitch-chat"
  role="button"
  tabindex="0"
  onclick={scrollToBottom}
  onkeydown={scrollToBottom}
  onscroll={updateAnchorVisibility}
>
  {#each messages as message (message.id)}
    <TwitchMessage {message} {shadow} />
  {/each}

  {#if loadingMessage}
    <Modal message={loadingMessage} />
  {/if}

  {#if status.kind === "error"}
    <div class="error-message" role="alert">
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
