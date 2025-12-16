import { fetchTrendingChannels } from "./TrendingChannels";

const TwitchChannel = {
  async getRandom(): Promise<string> {
    const channels = await fetchTrendingChannels();

    if (channels.length === 0) {
      return "";
    }

    return channels[Math.floor(Math.random() * channels.length)];
  },

  async getRandomList(count: number): Promise<string[]> {
    const channels = await fetchTrendingChannels();

    if (channels.length === 0) {
      return [];
    }

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
