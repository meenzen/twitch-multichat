<script lang="ts">
    import Spinner from "$lib/components/Spinner.svelte";

    let {loadingMessage = $bindable()} = $props<{ loadingMessage: string }>();
</script>

{#if loadingMessage.length > 0}
    <div class="loading-message">
        <div>
            <Spinner/>
        </div>
        <div>
            <span>{loadingMessage}</span>
        </div>
    </div>
{/if}

<style>
    .loading-message {
        font-size: 14px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
</style>
