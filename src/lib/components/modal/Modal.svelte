<script lang="ts">
  import Spinner from "#lib/components/Spinner.svelte";
  import { ModalPriority, modalStack } from "./modalStack.svelte";

  // Centered status overlay with a spinner. Render it conditionally; while
  // several are mounted only the one on top of the modal stack is visible.
  let {
    message,
    priority = ModalPriority.Chat,
  }: { message: string; priority?: number } = $props();

  const id = Symbol("modal");

  $effect(() => {
    modalStack.open(id, priority);
    return () => modalStack.close(id);
  });

  let visible = $derived(modalStack.top === id);
</script>

{#if visible}
  <div class="backdrop">
    <div class="modal" role="status" aria-live="polite">
      <div>
        <Spinner />
      </div>
      <div>
        <span>{message}</span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* covers the page so the message stays readable on busy pages, but lets
     clicks and scrolling through to the chat */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    pointer-events: none;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: color-mix(
      in srgb,
      var(--background-color) 85%,
      transparent
    );
  }

  .modal {
    font-size: 14px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
</style>
