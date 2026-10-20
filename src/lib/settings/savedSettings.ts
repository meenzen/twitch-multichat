// The user's own settings, remembered on this device. Stored as a query
// string so parsing (and dropping invalid values) works like for URLs.
// Overlay mode belongs to a link, not to the user, so it is never saved.

import { readItem, writeItem, type KeyValueStorage } from "#lib/storage.ts";
import {
  defaultSettings,
  hasSettings,
  parseSettings,
  settingsQuery,
  type ChatSettings,
} from "./ChatSettings";

const key = "settings";

/** The saved settings, the defaults if nothing is saved */
export function loadSettings(
  storage: KeyValueStorage | undefined,
): ChatSettings {
  const settings = parseSettings(
    new URLSearchParams(readItem(storage, key) ?? ""),
  );
  return { ...settings, overlay: defaultSettings.overlay };
}

/**
 * What a chat page starts with: a link with settings shows exactly those
 * (missing ones are defaults, so the sender's view is reproduced), a link
 * without any uses the saved settings.
 */
export function initialSettings(
  params: Pick<URLSearchParams, "get" | "has">,
  storage: KeyValueStorage | undefined,
): ChatSettings {
  return hasSettings(params) ? parseSettings(params) : loadSettings(storage);
}

export function saveSettings(
  storage: KeyValueStorage | undefined,
  settings: ChatSettings,
): void {
  writeItem(
    storage,
    key,
    settingsQuery({ ...settings, overlay: defaultSettings.overlay }),
  );
}
