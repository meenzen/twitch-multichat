<script lang="ts">
  import ColorGenerator from "$lib/ColorGenerator";
  import { type ParsedMessage } from "$lib/MessageParser";
  import TwitchMessage from "$lib/TwitchMessage.svelte";

  const exampleText = [
    "Hi",
    "Hello, how are you?",
    "This is so cool!",
    "I prefer Minecraft over Fortnite.",
    "Have you tried the new update?",
    "Let's team up for the next match!",
    "clip that",
    "huh?",
    "bruh",
  ];
  const exampleUsers = [
    "gamer123",
    "pro_player",
    "noobmaster69",
    "streamer_xyz",
    "chat_fanatic",
    "twitch_lover",
    "YourMom",
    "I_Am_Your_Father",
    "TheOneWhoKnocks",
    "DarthVader",
    "Neo",
    "johnwick",
    "lara_croft",
    "masterchief",
  ];
  const exampleChannels = ["channel1", "channel2", "channel3"];

  let randomChannels = Array.from(
    { length: 50 },
    () => exampleChannels[Math.floor(Math.random() * exampleChannels.length)],
  );

  function getMessages(): ParsedMessage[] {
    let messages: ParsedMessage[] = [];
    for (let channel of randomChannels) {
      let user = exampleUsers[Math.floor(Math.random() * exampleUsers.length)];
      let text = exampleText[Math.floor(Math.random() * exampleText.length)];
      messages.push({
        id: crypto.randomUUID(),
        type: 0,
        userName: user,
        displayName: user,
        userColor: ColorGenerator.generate(user),
        target: `@${channel}`,
        parts: [
          {
            type: 0,
            content: text,
          },
        ],
      });
    }
    return messages;
  }

  let messages = getMessages();
  let settings = $state({ channels: [], shadow: true });
</script>

<div class="twitch-chat">
  {#each messages as message (message.id)}
    <TwitchMessage {message} bind:settings />
  {/each}
</div>

<style>
  .twitch-chat {
    overflow-y: auto;
    height: 100%;
    width: 100%;
    padding-left: 5px;
    padding-right: 5px;
    box-sizing: border-box;
    font-size: 13px;
  }
</style>
