import { goto } from "$app/navigation";

/**
 * Swaps the current history entry's URL, for `persistInUrl`.
 *
 * Not a shallow `goto`: on back/forward SvelteKit restores a shallow entry
 * from the URL the page was loaded with, which drops the settings. A real
 * navigation stores the new URL in the entry; the chat pages' `load` only
 * parses the URL, and `reset: false` keeps focus and scroll position.
 */
export function replaceUrl(url: URL): Promise<void> {
  return goto(url, { replace: true, reset: false });
}
