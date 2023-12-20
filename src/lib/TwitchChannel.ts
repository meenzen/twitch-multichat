export const RANDOM_TWITCH_CHANNELS = [
    "ThePrimeagen",
    "teej_dv",
    "PirateSoftware",
    "CodeBullet",
    "xQc",
    "Asmongold",
    "Emiru",
    "sodapoppin",
    "Northernlion",
    "HealthyGamer_GG",
    "Wirtual",
    "ironmouse",
    "F1NN5TER",
    "Kitboga",
    "Shylily",
    "Moomellow",
    "Shenpai",
    "JoltzDude139",
    "lilypichu",
];


const TwitchChannel = {
    getRandom(): string {
        return RANDOM_TWITCH_CHANNELS[Math.floor(Math.random() * RANDOM_TWITCH_CHANNELS.length)];
    },

    getRandomList(count: number): string[] {
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
    },

    isValid(channel: string): boolean {
        if (channel.length < 2) {
            return false;
        }

        // channels must be alphanumeric or underscore, max 25 chars
        return /^[a-zA-Z0-9_]{2,25}$/.test(channel);
    },

    isValidList(channels: string[]): boolean {
        for (let i = 0; i < channels.length; i++) {
            if (!this.isValid(channels[i])) {
                return false;
            }
        }

        return true;
    }
}

export default TwitchChannel;
