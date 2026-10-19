<script lang="ts">
  import { onMount } from "svelte";
  import Modal from "#lib/components/modal/Modal.svelte";
  import { ModalPriority } from "#lib/components/modal/modalStack.svelte.ts";
  import {
    watchForUpdates,
    type WatchOptions,
  } from "#lib/serviceWorkerUpdates.ts";

  // Shows a modal while a new version installs, the page reloads afterwards.
  // The props only exist to inject fakes in tests.
  let { navigator, reload }: Pick<WatchOptions, "navigator" | "reload"> =
    $props();

  let updating = $state(false);

  onMount(() =>
    watchForUpdates({
      navigator,
      reload,
      onUpdateFound: () => (updating = true),
      onUpdateFailed: () => (updating = false),
    }),
  );
</script>

{#if updating}
  <Modal message="Installing update..." priority={ModalPriority.Update} />
{/if}
