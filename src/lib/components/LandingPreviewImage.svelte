<svelte:options css="injected" />

<script lang="ts">
  // Link preview of the landing page (1200x630): the brand on the left, a
  // made-up merged chat on the right to show what the app does. Rendered by
  // @ethercorps/sveltekit-og, which supports a subset of CSS (flexbox).
  let { logoUrl, host }: { logoUrl: string; host: string } = $props();

  const channels = [
    { name: "speedruns", color: "#ff6b9a" },
    { name: "cozygames", color: "#ffd43b" },
    { name: "esports", color: "#51cf66" },
  ];

  // short enough to fit on one line each
  const messages = [
    { channel: 1, user: "moss", color: "#ffa94d", text: "good morning chat" },
    { channel: 0, user: "PixelPanda", color: "#74c0fc", text: "that split!!" },
    { channel: 2, user: "GGWP_Kev", color: "#da77f2", text: "what a clutch" },
    { channel: 0, user: "frame", color: "#63e6be", text: "new PB incoming" },
    { channel: 2, user: "NightOwl", color: "#ff8787", text: "so close" },
    { channel: 1, user: "tea_time", color: "#a9e34b", text: "the cat is back" },
    { channel: 0, user: "Saltine", color: "#91a7ff", text: "chat is so fast" },
    { channel: 2, user: "Kappa_Kid", color: "#ffd8a8", text: "GG WP" },
    { channel: 1, user: "lofi_lena", color: "#e599f7", text: "so cozy today" },
  ];
</script>

<div class="background">
  <div class="brand">
    <img src={logoUrl} alt="" />
    <div class="name">Twitch Multichat</div>
    <div class="tagline">All your Twitch chats in one view</div>
    <div class="host">{host}</div>
  </div>

  <div class="chat">
    <div class="tabs">
      {#each channels as channel (channel.name)}
        <div class="tab" style="color: {channel.color}">{channel.name}</div>
      {/each}
    </div>
    <div class="messages">
      {#each messages as message, i (i)}
        <div class="message">
          <span style="color: {channels[message.channel].color}"
            >[{channels[message.channel].name}]</span
          >
          <span class="user" style="color: {message.color}"
            >{message.user}:</span
          >
          <span class="text">{message.text}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .background {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 56px;
    width: 100%;
    height: 100%;
    padding: 56px 64px;
    font-family: Inter;
    color: #efeff1;
    background-color: #0e0e10;
    /* the radial-gradient that was here made the renderer fail */
    border: 8px solid #9146ff;
  }

  .brand {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 470px;
    height: 100%;
  }

  /* in CSS: the renderer drops images with width/height attributes, they
     arrive as strings */
  img {
    width: 176px;
    height: 176px;
    border-radius: 24px;
    margin-bottom: 36px;
  }

  .name {
    font-size: 60px;
    font-weight: 700;
    line-height: 1.05;
  }

  .tagline {
    margin-top: 16px;
    font-size: 28px;
    line-height: 1.3;
    color: #bf94ff;
  }

  .host {
    margin-top: auto;
    font-size: 24px;
    color: #adadb8;
  }

  .chat {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    border: 2px solid #3a3a3d;
    border-radius: 20px;
    background-color: #18181b;
    overflow: hidden;
  }

  .tabs {
    display: flex;
    justify-content: center;
    gap: 28px;
    padding: 18px 24px;
    border-bottom: 2px solid #3a3a3d;
    font-size: 24px;
    font-weight: 700;
  }

  .messages {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    flex: 1;
    gap: 12px;
    padding: 18px 24px;
    font-size: 22px;
  }

  .message {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    white-space: nowrap;
  }

  .user {
    font-weight: 700;
  }

  .text {
    color: #efeff1;
  }
</style>
