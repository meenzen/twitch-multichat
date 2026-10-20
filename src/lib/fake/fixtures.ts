import ColorGenerator from "#lib/ColorGenerator.ts";
import {
  MessagePartType,
  MessageType,
  type MessagePart,
  type ParsedMessage,
} from "#lib/chat/ChatMessage.ts";
import { splitLinks } from "#lib/chat/links.ts";
import { bttvEmoteImages } from "#lib/emotes/bttv.ts";
import { sevenTvEmoteImages } from "#lib/emotes/seventv.ts";
import type { Emote } from "#lib/emotes/Emote.ts";
import { splitEmotes } from "#lib/emotes/splitEmotes.ts";

// Real global Twitch emote ids, so they render from the CDN. Emote names in
// the texts below become emote parts, like Twitch sends them.
const emotes = new Map(
  Object.entries({
    "4Head": "354",
    BabyRage: "22639",
    BloodTrail: "69",
    CoolCat: "58127",
    CoolStoryBob: "123171",
    DansGame: "33",
    DinoDance: "emotesv2_dcd06b30a5c24f6eb871e8f5edbd44f7",
    FailFish: "360",
    FrankerZ: "65",
    GivePLZ: "112291",
    HeyGuys: "30259",
    Jebaited: "114836",
    Kappa: "25",
    KappaPride: "55338",
    Keepo: "1902",
    KomodoHype: "304486301",
    Kreygasm: "41",
    LUL: "425618",
    MrDestructoid: "28",
    NotLikeThis: "58765",
    PJSalt: "36",
    PogChamp: "305954156",
    ResidentSleeper: "245",
    SeemsGood: "64138",
    SMOrc: "52",
    SwiftRage: "34",
    TakeNRG: "112292",
    TriHard: "120232",
    VoHiYo: "81274",
    WutFace: "28087",
  }),
);

// Real global BetterTTV and 7TV emotes, found in the text like
// TwitchChatSource does
const thirdPartyEmotes = new Map<string, Emote>([
  ...Object.entries({
    FeelsBadMan: "566c9fc265dbbdab32ec053b",
    FeelsGoodMan: "566c9fde65dbbdab32ec053e",
    KKona: "566ca04265dbbdab32ec054a",
    monkaS: "56e9f494fff3cc5c35e5287e",
    SourPls: "566ca38765dbbdab32ec0560",
    haHAA: "555981336ba1901877765555",
  }).map(([code, id]): [string, Emote] => [
    code,
    { id, code, images: bttvEmoteImages(id), provider: "bttv" },
  ]),
  ...Object.entries({
    PepePls: "01GCMQJGB0000D8ZK13J8KVCDX",
    peepoSad: "01GCS52CXG0004ZMF9GMF8X2AN",
    FeelsDankMan: "01GD3WX9P8000FR6FMGA73ZC9Z",
    WAYTOODANK: "01FGYPRTT0000BF1F0BAH6R39Q",
    AYAYA: "01GE732B7R0002G1FA1JB1A2RR",
    RainTime: "01FGH9W5BG00047CPSV86K549H",
  }).map(([code, id]): [string, Emote] => [
    code,
    {
      id,
      code,
      images: sevenTvEmoteImages(id),
      provider: "7tv",
      zeroWidth: code === "RainTime",
    },
  ]),
]);

const emoteNames = [
  ...emotes.keys(),
  ...[...thirdPartyEmotes.values()]
    .filter((e) => !e.zeroWidth)
    .map((e) => e.code),
];

const texts = [
  // reactions
  "W",
  "L",
  "W W W",
  "LMAO",
  "lmaooo",
  "LUL",
  "LUL LUL LUL",
  "KEKW",
  "OMEGALUL",
  "no way",
  "NO WAY",
  "nah",
  "nahhh",
  "huh?",
  "HUH",
  "what",
  "WHAT",
  "bruh",
  "bro",
  "BRO",
  "ez",
  "EZ Clap",
  "ggs",
  "gg",
  "GG WP",
  "clip that",
  "CLIP IT",
  "someone clip that",
  "true",
  "real",
  "so real",
  "based",
  "cringe",
  "sheesh",
  "SHEESH",
  "let's gooo",
  "LETS GOOOOO PogChamp",
  "PogChamp",
  "PogChamp PogChamp PogChamp",
  "Kreygasm",
  "NotLikeThis",
  "NotLikeThis NotLikeThis",
  "ResidentSleeper",
  "ResidentSleeper ResidentSleeper ResidentSleeper ResidentSleeper",
  "WutFace",
  "DansGame",
  "BabyRage",
  "SwiftRage",
  "4Head",
  "Kappa",
  "Kappa Kappa Kappa",
  "Keepo",
  "Jebaited",
  "FailFish",
  "SeemsGood",
  "HeyGuys",
  "VoHiYo",
  "CoolCat",
  "TriHard 7",
  "DinoDance DinoDance DinoDance",
  "KomodoHype KomodoHype",
  "BloodTrail",
  "SMOrc SMOrc SMOrc",
  "MrDestructoid",
  "monkaS",
  "monkaS monkaS",
  "FeelsGoodMan",
  "FeelsBadMan",
  "SourPls SourPls SourPls",
  "KKona",
  "haHAA",
  "PepePls PepePls PepePls",
  "peepoSad",
  "FeelsDankMan",
  "WAYTOODANK",
  "AYAYA AYAYA",
  "FeelsDankMan RainTime",
  "it's raining Kappa RainTime",
  "o7",
  "o7 o7 o7",
  "F",
  "F F F F",
  "1",
  "111111",
  "2",
  "?",
  "??",
  "???????",
  "!!!",
  ":)",
  ":(",
  "<3",
  "<3 <3 <3",
  "xD",
  "ok",
  "first",
  "lol",
  "lmao he really did that",
  "actual throw LUL",
  "he's so bad at this LUL",
  "chat is he stupid",
  "he's cooking",
  "let him cook",
  "LET HIM COOK",
  "that was clean",
  "insane clip",
  "that's crazy",
  "my heart PJSalt",
  "unlucky",
  "rigged",
  "RIGGED SwiftRage",
  "skill issue",
  "diff",
  "jungle diff",
  "aim diff Kappa",
  "he's lagging",
  "audio is out of sync",
  "mic muted?",
  "MIC",
  "you're muted",
  "stream froze for me",
  "it's fine for me",
  "F5",
  // greetings and chatter
  "hi chat",
  "hello chat HeyGuys",
  "hey everyone VoHiYo",
  "yo",
  "good morning from europe",
  "gm",
  "gn chat, see you tomorrow",
  "just got here, what did I miss?",
  "back, what happened",
  "first time chatter, love the stream <3",
  "been watching for 3 years, never chatted before",
  "lurking while working Kappa",
  "watching from my phone at work don't tell my boss",
  "this is my comfort stream",
  "the vibes today are immaculate",
  "chat is moving so fast nobody will notice I love cheese",
  "mods are asleep, post frogs",
  // questions
  "what game is this?",
  "what rank is he?",
  "what's the song?",
  "song name?",
  "how long has he been live?",
  "is this a new map?",
  "when is the next video coming out?",
  "what keyboard is that?",
  "what sens do you play on?",
  "does he read chat?",
  "can you play the new update next?",
  "are you doing the tournament this weekend?",
  "did he beat the boss yet?",
  "how many deaths so far?",
  // commands and mentions
  "!uptime",
  "!song",
  "!discord",
  "!followage",
  "!specs",
  "!rank",
  "!socials",
  "@streamer_xyz say hi to my mom please",
  "@Nightbot thanks",
  "@xQcFanboy99 he literally just said it",
  "@chat_fanatic no way you actually believe that LUL",
  "@moon_beam_ it's on his discord",
  "@ShadowNinja_ go to sleep",
  // gifting / hype
  "thanks for the sub gifts!!",
  "HYPE TRAIN KomodoHype KomodoHype",
  "LEVEL 5 HYPE TRAIN LETS GO",
  "GivePLZ TAKE MY ENERGY TakeNRG",
  "raid incoming",
  "WELCOME RAIDERS HeyGuys",
  // other languages
  "moin",
  "jajajaja",
  "kkkkkkkkk",
  "ㅋㅋㅋㅋㅋ",
  "mdr",
  "привет",
  "¿qué pasó?",
  "hola desde méxico",
  // links
  "clips.twitch.tv/SomeFunnyClipName",
  "check out the clip https://clips.twitch.tv/SomeFunnyClipName-AbC123",
  "the map is on twitch.tv/videos/123456789 at 2:31:00",
  // copypasta and layout stress cases
  "I'm not saying he's bad, I'm just saying that if I had his setup and his hours I would be top 500 already, but hey what do I know, I'm just a guy in chat Kappa",
  "This is a deliberately long message to check how wrapping behaves when somebody decides to paste an entire paragraph into chat instead of a short reaction, which happens more often than you would think.",
  "https://example.com/a/very/long/url/without/any/spaces/that/needs/to/break/somewhere/in/the/layout",
];

/** /me messages */
const actions = [
  "waves",
  "dances DinoDance",
  "hands out cookies",
  "is lurking",
  "grabs popcorn",
  "throws confetti",
  "sits quietly in the corner",
  "is vibing",
];

// Display names; the user name is the lowercase version
const users = [
  "xQcFanboy99",
  "Nightbot",
  "StreamElements",
  "moon_beam_",
  "ShadowNinja_",
  "pixelpanda",
  "Big_Chungus_420",
  "notaburneraccount",
  "lilsprout",
  "TacoTuesday",
  "sweatyTryhard",
  "GrandmaGamer",
  "dadjokes_only",
  "Kevin",
  "kev1n",
  "z3r0c00l",
  "FrostByte",
  "the_real_slim",
  "coffee_and_code",
  "Nerdy_Bird",
  "SirLurksALot",
  "pog_enjoyer",
  "monkaS_andy",
  "chillguy",
  "CaptainCrunch",
  "midlaner_main",
  "bigbrain_moves",
  "touchgrass",
  "aFkMaster",
  "BananaBread",
  "Saltine",
  "jungle_goblin",
  "VibeCheck",
  "noodle_arms",
  "Clutch_or_Kick",
  "sp4ghetti",
  "OwO_whats_this",
  "ElGato_Loco",
  "Mischa_DE",
  "seoul_searching",
  "gamer123",
  "pro_player",
  "noobmaster69",
  "streamer_xyz",
  "chat_fanatic",
  "twitch_lover",
  "DarthVader",
  "Neo",
  "johnwick",
  "lara_croft",
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
    timestamp: Date.now(),
    ...rest,
  };
}

/** Split text into parts, turning known emote names into emotes */
export function textToParts(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  for (const word of text.split(/( )/)) {
    const id = emotes.get(word);
    if (id) {
      parts.push({ type: MessagePartType.Emote, content: id, emoteName: word });
      continue;
    }
    const last = parts.at(-1);
    if (last?.type === MessagePartType.Text) {
      last.content += word;
    } else if (word) {
      parts.push({ type: MessagePartType.Text, content: word });
    }
  }
  return splitLinks(splitEmotes(parts, thirdPartyEmotes));
}

export function randomMessage(
  random: () => number = Math.random,
  channels: string[] = defaultChannels,
): ParsedMessage {
  const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)];

  const user = pick(users);
  const isAction = random() < 0.04;
  let text = pick(isAction ? actions : texts);
  // people often tack an emote onto the end
  if (!isAction && random() < 0.15) {
    text += ` ${pick(emoteNames)}`;
  }

  return createMessage({
    type: isAction ? MessageType.Action : MessageType.Normal,
    channel: pick(channels),
    userName: user.toLowerCase(),
    displayName: user,
    userColor: random() < 0.2 ? undefined : ColorGenerator.generate(user),
    parts: textToParts(text),
  });
}

export function randomMessages(
  count: number,
  random: () => number = Math.random,
  channels: string[] = defaultChannels,
): ParsedMessage[] {
  return Array.from({ length: count }, () => randomMessage(random, channels));
}
