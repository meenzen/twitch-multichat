<script lang="ts">
    let {italicized = false} = $props<{ italicized?: boolean }>()
</script>

{#if italicized}
    <span class="italicized">
        <slot/>
    </span>
{:else}
    <slot/>
{/if}

<style>
    .italicized {
        font-style: italic;
    }
</style>