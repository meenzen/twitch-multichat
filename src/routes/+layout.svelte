<script lang="ts">
  import UpdateNotifier from "#lib/components/UpdateNotifier.svelte";

  let { children } = $props();
</script>

<UpdateNotifier />

<main>
  {@render children()}
</main>
