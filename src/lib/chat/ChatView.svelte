<script lang="ts">
  import { untrack } from "svelte";
  import TwitchMessage from "#lib/TwitchMessage.svelte";
  import Modal from "#lib/components/modal/Modal.svelte";
  import DisconnectMarker from "./DisconnectMarker.svelte";
  import { isMessage, type ChatEntry } from "./ChatMessage";
  import type { ChatStatus } from "./ChatSource";
  import { StickToBottom } from "./StickToBottom";

  // Pure presentation: renders whatever messages it is given. All data comes
  // in through props, so layouts can be iterated on with fixture data.
  // Fills its parent, which needs a definite height.
  let {
    messages,
    status = { kind: "ready" },
    shadow = true,
    following = $bindable(true),
  }: {
    messages: ChatEntry[];
    status?: ChatStatus;
    shadow?: boolean;
    /** Whether the view is pinned to the newest message */
    following?: boolean;
  } = $props();

  let scroller = $state(null as HTMLDivElement | null);
  let content = $state(null as HTMLDivElement | null);
  let stick: StickToBottom | undefined;

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

  $effect(() => {
    if (!scroller || !content) return;
    const instance = new StickToBottom(scroller, {
      observe: [scroller, content],
      onChange: (value) => (following = value),
    });
    stick = instance;
    untrack(() => (following = instance.following));
    return () => instance.destroy();
  });

  $effect(() => {
    // re-pin after every rendered change of the message list
    void messages;
    untrack(() => stick?.update());
  });
</script>

<div class="chat-view">
  <div
    class="twitch-chat"
    class:following
    bind:this={scroller}
    data-testid="chat-scroller"
  >
    <div bind:this={content}>
      {#each messages as entry (entry.id)}
        {#if isMessage(entry)}
          <TwitchMessage message={entry} {shadow} />
        {:else}
          <DisconnectMarker {entry} />
        {/if}
      {/each}

      {#if status.kind === "error"}
        <div class="error-message" role="alert">
          <span class="message-text">Failed to connect to twitch chat.</span>
          <span class="message-text">Please try to refresh the page.</span>
        </div>
      {/if}
    </div>
  </div>

  {#if !following}
    <button
      class="jump-to-latest"
      type="button"
      onclick={() => stick?.follow()}
    >
      More messages below
    </button>
  {/if}

  {#if loadingMessage}
    <Modal message={loadingMessage} />
  {/if}
</div>

<style>
  .chat-view {
    position: relative;
    height: 100%;
    width: 100%;
  }

  .twitch-chat {
    overflow-y: auto;
    overscroll-behavior: contain;
    height: 100%;
    width: 100%;
    padding-left: 5px;
    padding-right: 5px;
    box-sizing: border-box;
    font-size: 13px;
  }

  /* While following, StickToBottom owns the scroll position. Otherwise let
     the browser keep the messages being read in place when old ones are
     trimmed from the top. */
  .twitch-chat.following {
    overflow-anchor: none;
  }

  .error-message {
    font-weight: 700;
    font-size: 20px;
    color: orangered;
    margin-top: 2px;
    margin-bottom: 5px;
    overflow-wrap: break-word;
  }

  .jump-to-latest {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 14px;
    border: none;
    border-radius: 999px;
    background-color: var(--twitch-purple);
    color: var(--text-color);
    font-family: var(--twitch-font-family);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 2px 8px rgb(0 0 0 / 50%);
  }
</style>
