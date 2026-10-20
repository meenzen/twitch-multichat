import type { Emote, EmoteMap, EmoteProvider } from "./Emote";

/**
 * Collects the emotes of a channel from all providers. Global emotes are
 * fetched once and shared between channels. Failures are logged and leave
 * the affected emotes out, so a service that is down never blocks the chat.
 */
export class EmoteLoader {
  private globals = new Map<EmoteProvider, Promise<Emote[]>>();

  constructor(private readonly providers: EmoteProvider[]) {}

  /**
   * On a name clash channel emotes beat global ones (of any provider), then
   * later providers beat earlier ones.
   */
  async load(channelId: string): Promise<EmoteMap> {
    const lists = await Promise.all([
      ...this.providers.map((provider) => this.global(provider)),
      ...this.providers.map((provider) =>
        provider.channel(channelId).catch((error: unknown) => {
          console.warn(`Failed to load ${provider.name} emotes:`, error);
          return [];
        }),
      ),
    ]);

    const emotes = new Map<string, Emote>();
    for (const emote of lists.flat()) emotes.set(emote.code, emote);
    return emotes;
  }

  private global(provider: EmoteProvider): Promise<Emote[]> {
    let list = this.globals.get(provider);
    if (!list) {
      list = provider.global().catch((error: unknown) => {
        console.warn(`Failed to load global ${provider.name} emotes:`, error);
        // try again with the next channel
        this.globals.delete(provider);
        return [];
      });
      this.globals.set(provider, list);
    }
    return list;
  }
}
