<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import Copy from "@lucide/svelte/icons/copy";
  import X from "@lucide/svelte/icons/x";
  import GitHubLink from "#lib/components/GitHubLink.svelte";
  import { fontSizes, type FontSize } from "./ChatSettings";
  import type { Settings } from "./Settings.svelte";

  // Modal settings menu. A native <dialog> keeps focus inside while open and
  // returns it to the settings button when closed. Escape is handled by
  // ChatScreen, which toggles `open`.
  let {
    settings,
    open = $bindable(false),
    currentUrl = () => new URL(window.location.href),
    clipboard,
  }: {
    settings: Settings;
    open?: boolean;
    currentUrl?: () => URL;
    clipboard?: Pick<Clipboard, "writeText">;
  } = $props();

  const sizeLabels: Record<FontSize, string> = {
    small: "Small",
    medium: "Medium",
    large: "Large",
    huge: "Huge",
  };
  const sizes = Object.keys(fontSizes) as FontSize[];

  let dialog = $state(null as HTMLDialogElement | null);
  let urlInput = $state(null as HTMLInputElement | null);
  let copyState = $state("idle" as "idle" | "copied" | "failed");
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  let overlayUrl = $derived(open ? settings.overlayUrl(currentUrl()) : "");

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  $effect(() => () => clearTimeout(copyTimer));

  async function copy() {
    clearTimeout(copyTimer);
    try {
      await (clipboard ?? navigator.clipboard).writeText(overlayUrl);
      copyState = "copied";
    } catch {
      // no clipboard access: leave the URL selected for a manual copy
      urlInput?.select();
      copyState = "failed";
    }
    copyTimer = setTimeout(() => (copyState = "idle"), 3000);
  }

  function onBackdropClick(event: MouseEvent) {
    if (event.target === dialog) open = false;
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="settings-title"
  onclose={() => (open = false)}
  onclick={onBackdropClick}
>
  <div class="content">
    <header>
      <h2 id="settings-title">Settings</h2>
      <button
        type="button"
        class="icon-button"
        aria-label="Close settings"
        title="Close (Esc)"
        onclick={() => (open = false)}
      >
        <X size={20} aria-hidden="true" />
      </button>
    </header>

    <fieldset class="sizes">
      <legend>Text size</legend>
      <div class="segmented">
        {#each sizes as size (size)}
          <label>
            <input
              type="radio"
              name="font-size"
              value={size}
              bind:group={settings.values.fontSize}
            />
            <span>{sizeLabels[size]}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>Messages</legend>
      <label class="toggle">
        <input type="checkbox" bind:checked={settings.values.channelTag} />
        Show channel name
      </label>
      <label class="toggle">
        <input type="checkbox" bind:checked={settings.values.timestamps} />
        Show timestamps
      </label>
      <label class="toggle">
        <input type="checkbox" bind:checked={settings.values.shadow} />
        Outline names
      </label>
    </fieldset>

    <fieldset>
      <legend>Emotes</legend>
      <label class="toggle">
        <input type="checkbox" bind:checked={settings.values.bttv} />
        BetterTTV emotes
      </label>
    </fieldset>

    <fieldset>
      <legend>Overlay</legend>
      <p class="hint" id="overlay-hint">
        Use this URL as a browser source in OBS or other streaming software. It
        hides the top bar and has a transparent background.
      </p>
      <div class="copy-row">
        <input
          bind:this={urlInput}
          type="text"
          readonly
          value={overlayUrl}
          aria-label="Overlay URL"
          aria-describedby="overlay-hint"
          onfocus={(e) => e.currentTarget.select()}
        />
        <button type="button" class="text-button" onclick={copy}>
          {#if copyState === "copied"}
            <Check size={16} aria-hidden="true" /> Copied
          {:else}
            <Copy size={16} aria-hidden="true" /> Copy
          {/if}
        </button>
      </div>
      <p class="status" role="status">
        {#if copyState === "copied"}
          Overlay URL copied to the clipboard.
        {:else if copyState === "failed"}
          Could not access the clipboard, press Ctrl+C to copy the URL.
        {/if}
      </p>
    </fieldset>

    <footer>
      <!-- new tab, so the chat keeps running -->
      <GitHubLink newTab />
      <button
        type="button"
        class="text-button"
        onclick={() => settings.reset()}
      >
        Reset to defaults
      </button>
    </footer>
  </div>
</dialog>

<style>
  dialog {
    width: min(26rem, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    padding: 0;
    border: 1px solid var(--muted-text-color);
    border-radius: 8px;
    background-color: var(--background-color);
    color: var(--text-color);
    font-family: var(--twitch-font-family);
    font-size: 14px;
    box-shadow: 0 4px 24px rgb(0 0 0 / 60%);
  }

  dialog::backdrop {
    background-color: rgb(0 0 0 / 60%);
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    margin: 0;
    font-size: 18px;
  }

  fieldset {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    border: none;
  }

  legend {
    padding: 0;
    margin-bottom: 8px;
    font-weight: 700;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--twitch-purple);
  }

  .segmented {
    display: flex;
    border: 1px solid var(--muted-text-color);
    border-radius: 6px;
    overflow: hidden;
  }

  .segmented label {
    flex: 1;
    position: relative;
  }

  .segmented label + label {
    border-left: 1px solid var(--muted-text-color);
  }

  /* visually hidden but still focusable, arrow keys move between them */
  .segmented input {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: pointer;
  }

  .segmented span {
    display: block;
    padding: 6px 0;
    text-align: center;
  }

  .segmented input:checked + span {
    background-color: var(--twitch-purple);
    font-weight: 700;
  }

  .segmented input:focus-visible + span {
    outline: 2px solid var(--link-color);
    outline-offset: -2px;
  }

  .hint {
    margin: 0;
    color: var(--muted-text-color);
  }

  .copy-row {
    display: flex;
    gap: 8px;
  }

  .copy-row input {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    border: 1px solid var(--muted-text-color);
    border-radius: 6px;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 12px;
  }

  .status {
    margin: 0;
    min-height: 1.2em;
    font-size: 12px;
    color: var(--link-color);
  }

  footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .text-button,
  .icon-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--muted-text-color);
    border-radius: 6px;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .text-button {
    padding: 6px 12px;
  }

  .icon-button {
    padding: 2px;
    border-color: transparent;
  }

  .text-button:hover,
  .icon-button:hover {
    border-color: var(--twitch-purple);
  }

  button:focus-visible,
  .copy-row input:focus-visible {
    outline: 2px solid var(--link-color);
    outline-offset: 1px;
  }
</style>
