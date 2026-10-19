import ColorGenerator from "#lib/ColorGenerator.ts";
import {
  MessagePartType,
  MessageType,
  type MessagePart,
  type ParsedMessage,
} from "#lib/chat/ChatMessage.ts";

const texts = [
  "Hi",
  "Hello, how are you?",
  "This is so cool!",
  "I prefer Minecraft over Fortnite.",
  "Have you tried the new update?",
  "Let's team up for the next match!",
  "clip that",
  "huh?",
  "bruh",
  "This is a deliberately long message to check how wrapping behaves when somebody decides to paste an entire paragraph into chat instead of a short reaction, which happens more often than you would think.",
  "https://example.com/a/very/long/url/without/any/spaces/that/needs/to/break/somewhere/in/the/layout",
];

const users = [
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

// Real global Twitch emote ids, so they render from the CDN
const emotes = [
  { id: "25", name: "Kappa" },
  { id: "425618", name: "LUL" },
  { id: "354", name: "4Head" },
  { id: "64138", name: "SeemsGood" },
];

export const defaultChannels = ["channel1", "channel2", "channel3"];

/** Deterministic PRNG (mulberry32) so fixtures are reproducible */
export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nextId = 0;

/** Build a message with sensible defaults, override what the test cares about */
export function createMessage(
  overrides: Partial<ParsedMessage> & { text?: string } = {},
): ParsedMessage {
  const { text = "Hello", ...rest } = overrides;
  const userName = rest.userName ?? "testuser";
  return {
    id: `msg-${++nextId}`,
    type: MessageType.Normal,
    channel: "channel1",
    userId: `id-${userName}`,
    userName,
    displayName: userName,
    userColor: ColorGenerator.generate(userName),
    parts: [{ type: MessagePartType.Text, content: text }],
    ...rest,
  };
}

export function randomMessage(
  random: () => number = Math.random,
  channels: string[] = defaultChannels,
): ParsedMessage {
  const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)];

  const user = pick(users);
  const parts: MessagePart[] = [
    { type: MessagePartType.Text, content: pick(texts) },
  ];

  const roll = random();
  if (roll < 0.25) {
    const emote = pick(emotes);
    parts.push(
      { type: MessagePartType.Text, content: " " },
      { type: MessagePartType.Emote, content: emote.id, emoteName: emote.name },
    );
  } else if (roll < 0.3) {
    const emote = pick(emotes);
    parts.splice(0, 1, {
      type: MessagePartType.Emote,
      content: emote.id,
      emoteName: emote.name,
    });
  }

  return createMessage({
    type: random() < 0.1 ? MessageType.Action : MessageType.Normal,
    channel: pick(channels),
    userName: user.toLowerCase(),
    displayName: user,
    userColor: random() < 0.2 ? undefined : ColorGenerator.generate(user),
    parts,
  });
}

export function randomMessages(
  count: number,
  random: () => number = Math.random,
  channels: string[] = defaultChannels,
): ParsedMessage[] {
  return Array.from({ length: count }, () => randomMessage(random, channels));
}
