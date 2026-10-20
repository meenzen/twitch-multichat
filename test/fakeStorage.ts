import type { KeyValueStorage } from "#lib/storage.ts";

/** In-memory stand-in for localStorage */
export function fakeStorage(
  initial: Record<string, string> = {},
): KeyValueStorage & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

/** Storage that throws like a blocked localStorage */
export const brokenStorage: KeyValueStorage = {
  getItem() {
    throw new DOMException("blocked", "SecurityError");
  },
  setItem() {
    throw new DOMException("full", "QuotaExceededError");
  },
};
