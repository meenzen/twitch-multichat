// Recently opened channel selections, newest first, for the landing page.

import TwitchChannel from "./TwitchChannel";
import { readItem, writeItem, type KeyValueStorage } from "./storage";

const key = "recentChannels";
export const maxRecent = 5;

/** Same channels, in any order or case */
function sameSelection(a: string[], b: string[]): boolean {
  const normalize = (list: string[]) =>
    list
      .map((c) => c.toLowerCase())
      .sort()
      .join(",");
  return normalize(a) === normalize(b);
}

export function loadRecent(storage: KeyValueStorage | undefined): string[][] {
  try {
    const value: unknown = JSON.parse(readItem(storage, key) ?? "[]");
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter(
      (list): list is string[] =>
        Array.isArray(list) &&
        list.length > 0 &&
        list.every((c) => typeof c === "string") &&
        TwitchChannel.isValidList(list),
    );
  } catch {
    return [];
  }
}

/** Moves `channels` to the front, returns the new list */
export function addRecent(
  storage: KeyValueStorage | undefined,
  channels: string[],
): string[][] {
  const recent = [
    channels,
    ...loadRecent(storage).filter((list) => !sameSelection(list, channels)),
  ].slice(0, maxRecent);
  writeItem(storage, key, JSON.stringify(recent));
  return recent;
}

/** Returns the new list */
export function removeRecent(
  storage: KeyValueStorage | undefined,
  channels: string[],
): string[][] {
  const recent = loadRecent(storage).filter(
    (list) => !sameSelection(list, channels),
  );
  writeItem(storage, key, JSON.stringify(recent));
  return recent;
}
