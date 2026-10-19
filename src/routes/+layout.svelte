<script lang="ts">
  import { onMount } from "svelte";
  import { watchForUpdates } from "#lib/serviceWorkerUpdates.ts";

  onMount(() => watchForUpdates());

  let { children } = $props();
</script>

<main>
  {@render children()}
</main>
