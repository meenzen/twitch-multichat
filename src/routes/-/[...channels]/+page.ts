import TwitchChannel from "$lib/TwitchChannel";
import type { ChatSettings } from "$lib/ChatSettings";

export const ssr = false;

function getSettings(url: URL): ChatSettings {
  const shadowParam = url.searchParams.get("shadow");
  let shadow = true;

  if (shadowParam === "false") {
    shadow = false;
  }

  return {
    channels: [],
    shadow: shadow,
  };
}

export function load({ params, url }): ChatSettings {
  const channelsString = params.channels;
  const settings = getSettings(url);

  if (channelsString.trim().length === 0) {
    return settings;
  }

  const channels = channelsString.split("/");

  if (!TwitchChannel.isValidList(channels)) {
    return settings;
  }

  settings.channels = channels;
  return settings;
}
