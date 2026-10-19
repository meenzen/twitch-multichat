import TwitchChannel from "#lib/TwitchChannel.ts";
import {
  parseSettings,
  type ChatSettings,
} from "#lib/settings/ChatSettings.ts";

export const ssr = true;

export function load({ params, url }): {
  channels: string[];
  settings: ChatSettings;
} {
  const channelsString = params.channels;
  const settings = parseSettings(url.searchParams);

  if (channelsString.trim().length === 0) {
    return { channels: [], settings };
  }

  const channels = channelsString.split("/");

  if (!TwitchChannel.isValidList(channels)) {
    return { channels: [], settings };
  }

  return { channels, settings };
}
