// Going back from a chat to the channel selection keeps the channels (to
// edit them) and the settings (for the next chat). Both travel in the landing
// page's query string: `/?channels=a,b&size=large`.

import TwitchChannel from "./TwitchChannel";
import {
  defaultSettings,
  parseSettings,
  settingsQuery,
  type ChatSettings,
} from "./settings/ChatSettings";

/** `home` (the landing page's path) with the channels and settings */
export function selectionHref(
  home: string,
  channels: string[],
  settings: ChatSettings,
): string {
  const params = new URLSearchParams(
    settingsQuery({ ...settings, overlay: defaultSettings.overlay }),
  );
  if (channels.length > 0) {
    params.set("channels", channels.join(","));
  }
  const query = params.toString();
  return query ? `${home}?${query}` : home;
}

/**
 * The landing page's side: the channels to prefill and the settings query
 * (without `?`, empty for none) to pass on to the chat.
 */
export function readSelection(params: URLSearchParams): {
  channels: string[];
  settingsQuery: string;
} {
  const channels = (params.get("channels") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  return {
    channels: TwitchChannel.isValidList(channels) ? channels : [],
    settingsQuery: settingsQuery(parseSettings(params)),
  };
}
