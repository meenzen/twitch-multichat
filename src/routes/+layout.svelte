<script lang="ts">
  import { onMount } from "svelte";

  const intervalMS = 10 * 60 * 1000; // check for updates every 10 minutes

  // SvelteKit registers the service worker, we only poll for updates
  onMount(() => {
    if (!("serviceWorker" in navigator)) return;

    let interval: ReturnType<typeof setInterval> | undefined;

    navigator.serviceWorker.ready.then((registration) => {
      interval = setInterval(async () => {
        if (registration.installing) return;

        if (!navigator.onLine) return;

        console.log("Checking for sw update");

        await registration.update();
      }, intervalMS);
    });

    return () => clearInterval(interval);
  });

  let { children } = $props();
</script>

<main>
  {@render children()}
</main>
