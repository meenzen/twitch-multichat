import { getCachedChannels } from "./TrendingChannels";

// Fallback channels if API fetch fails or hasn't completed yet
const FALLBACK_CHANNELS = [
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
  "SovietWomble",
];

const TwitchChannel = {
  getRandom(): string {
    const channels = getCachedChannels() || FALLBACK_CHANNELS;
    return channels[Math.floor(Math.random() * channels.length)];
  },

  getRandomList(count: number): string[] {
    const channels = getCachedChannels() || FALLBACK_CHANNELS;
    const channelCount = channels.length;

    if (count > channelCount) {
      count = channelCount;
    }

    const candidates = [...channels];
    const result = [];
    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * candidates.length);
      result.push(candidates[index]);
      candidates.splice(index, 1);
    }

    return result;
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
  },
};

export default TwitchChannel;
