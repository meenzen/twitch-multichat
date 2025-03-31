<script lang="ts">
  import type { Snippet } from "svelte";

    let {italicized = false, children} = $props<{ italicized?: boolean, childred: Snippet }>()
</script>

{#if italicized}
    <span class="italicized">
        {@render children()}
    </span>
{:else}
    {@render children()}
{/if}

<style>
    .italicized {
        font-style: italic;
    }
</style>
