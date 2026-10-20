// Small values remembered on this device (localStorage). Storage can be
// missing or throw (private windows, blocked site data), so everything here
// fails quietly: reads return null, writes are dropped.

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/** `localStorage`, or undefined where it is not available */
export function browserStorage(): KeyValueStorage | undefined {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

export function readItem(
  storage: KeyValueStorage | undefined,
  key: string,
): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeItem(
  storage: KeyValueStorage | undefined,
  key: string,
  value: string,
): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // full or blocked: not remembering is fine
  }
}
