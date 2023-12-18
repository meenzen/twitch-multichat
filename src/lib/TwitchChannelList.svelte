<script lang="ts">
    let {channels} = $props<{ channels: string[] }>();
</script>

<div class="channel-list">
    <table>
        <tbody>
        {#each channels as channel}
            <tr>
                <td>{channel}</td>
            </tr>
        {/each}
        </tbody>
    </table>
</div>

<style>
    table, tbody, th, td {
        width: 100%;
        text-align: center;
    }
    
    .channel-list {
        font-size: var(--text-size);
        font-family: var(--font-family);
        width: 100%;
    }
</style>