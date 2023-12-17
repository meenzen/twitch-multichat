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
        font-size: 25px;
        font-family: sans-serif;
        width: 100%;
    }
</style>