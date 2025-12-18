<svelte:options css="injected" />

<script lang="ts">
  let { channels, logoUrl }: { channels: string[]; logoUrl: string } = $props();
  let flip = $derived(channels.length > 6);
</script>

<section class="background">
  <section class="card debug-border">
    <section class="logo debug-border">
      <img src={logoUrl} alt="Logo" width="250" height="250" />
      <h2 class="no-padding">Twitch Multichat</h2>
    </section>
    <section class="text debug-border">
      <h1 class="title no-padding">Combined Chat</h1>
      <section class="channels debug-border {flip ? 'flipped' : ''}">
        {#each channels as channel (channel)}
          <h2 class="channel no-padding">
            {channel}
          </h2>
        {/each}
      </section>
    </section>
  </section>
</section>

<style>
  img {
    border-radius: 10%;
  }
  .no-padding {
    padding: 0;
    margin: 0;
  }
  .background {
    width: 100%;
    height: 100%;
    background-color: #9146ff;
  }
  .card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;

    width: 100%;
    height: 100%;
    padding: 10%;

    font-family: Inter;
    background-color: #0e0e10;
    color: #efeff1;
    border: 5px solid #9146ff;
    border-radius: 25px;
  }
  .logo {
    flex: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .text {
    flex: 3;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;
  }
  .channels {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    gap: 15px;
  }
  .flipped {
    flex-wrap: wrap;
    flex-direction: row;
  }
  .channel {
    text-align: center;
    margin-left: auto;
    margin-right: auto;
    color: #9146ff;
  }
</style>
