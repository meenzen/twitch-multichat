export const RANDOM_TWITCH_CHANNELS = [
    "theprimeagen",
    "teej_dv",
    "piratesoftware",
    "codebullet",
    "xqc",
    "asmongold",
    "emiru",
    "sodapoppin",
    "northernlion",
    "healthygamer_gg",
    "wirtual",
    "ironmouse",
    "f1nn5ter",
];

export function getRandomTwitchChannel(): string {
    return RANDOM_TWITCH_CHANNELS[Math.floor(Math.random() * RANDOM_TWITCH_CHANNELS.length)];
}

export function getRandomTwitchChannels(count: number): string[] {
    const channelCount = RANDOM_TWITCH_CHANNELS.length;

    if (count > channelCount) {
        count = channelCount;
    }

    const candidates = [...RANDOM_TWITCH_CHANNELS];
    const channels = [];
    for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * candidates.length);
        channels.push(candidates[index]);
        candidates.splice(index, 1);
    }

    return channels;
}