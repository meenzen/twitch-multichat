import {
  defaultSettings,
  settingsUrl,
  type ChatSettings,
} from "./ChatSettings";

/** Reactive chat settings, changed from the settings dialog */
export class Settings {
  values: ChatSettings = $state({ ...defaultSettings });

  constructor(initial: Partial<ChatSettings> = {}) {
    Object.assign(this.values, initial);
  }

  /** Back to the defaults; overlay mode is not part of the menu, so it stays */
  reset(): void {
    Object.assign(this.values, {
      ...defaultSettings,
      overlay: this.values.overlay,
    });
  }

  /** `url` with the current settings, for use in streaming software */
  overlayUrl(url: URL): string {
    return settingsUrl(url, { ...this.values, overlay: true }).href;
  }
}

/**
 * Mirrors the settings into the query string whenever they change, until the
 * returned function is called. `replace` should swap the URL without a
 * navigation or history entry.
 */
export function persistInUrl(
  settings: Settings,
  {
    // a snapshot of the address bar, not reactive state
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    current = () => new URL(window.location.href),
    replace,
  }: { current?: () => URL; replace: (url: URL) => void },
): () => void {
  return $effect.root(() => {
    $effect(() => {
      const url = current();
      const next = settingsUrl(url, settings.values);
      if (next.href !== url.href) {
        replace(next);
      }
    });
  });
}
