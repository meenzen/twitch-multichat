import type {
  ChannelEmotes,
  Emote,
  EmoteChange,
  EmoteMap,
  EmoteProvider,
} from "./Emote";

type Listener = (
  channelId: string,
  emotes: EmoteMap,
  description: string,
) => void;

/**
 * Collects the emotes of a channel from all providers. Global emotes are
 * fetched once and shared between channels. Failures are logged and leave
 * the affected emotes out, so a service that is down never blocks the chat.
 *
 * Once a channel is loaded, providers that push changes are watched, and
 * listeners get the channel's new emotes after every change.
 */
export class EmoteLoader implements ChannelEmotes {
  private globals = new Map<EmoteProvider, Promise<Emote[]>>();
  /** Last channel lists that loaded, by `key()` */
  private channels = new Map<string, Emote[]>();
  /** Stops watching, by `key()` */
  private watching = new Map<string, () => void>();
  private listeners = new Set<Listener>();

  constructor(private readonly providers: EmoteProvider[]) {}

  async load(channelId: string): Promise<EmoteMap> {
    const [globals] = await Promise.all([
      Promise.all(this.providers.map((provider) => this.global(provider))),
      ...this.providers.map((provider) => this.channel(provider, channelId)),
    ]);
    for (const provider of this.providers) this.watch(provider, channelId);
    return this.compose(channelId, globals);
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Stop watching all channels */
  close(): void {
    for (const stop of this.watching.values()) stop();
    this.watching.clear();
    this.listeners.clear();
  }

  /**
   * On a name clash channel emotes beat global ones (of any provider), then
   * later providers beat earlier ones.
   */
  private async compose(
    channelId: string,
    globals?: Emote[][],
  ): Promise<EmoteMap> {
    globals ??= await Promise.all(
      this.providers.map((provider) => this.global(provider)),
    );
    const channels = this.providers.map(
      (provider) => this.channels.get(this.key(provider, channelId)) ?? [],
    );

    const emotes = new Map<string, Emote>();
    for (const emote of [...globals, ...channels].flat()) {
      emotes.set(emote.code, emote);
    }
    return emotes;
  }

  /**
   * A failed refresh (on rejoin) keeps the list that loaded before, so an
   * outage doesn't take away emotes the channel already had.
   */
  private async channel(
    provider: EmoteProvider,
    channelId: string,
  ): Promise<void> {
    try {
      const list = await provider.channel(channelId);
      this.channels.set(this.key(provider, channelId), list);
    } catch (error) {
      console.warn(`Failed to load ${provider.name} emotes:`, error);
    }
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

  private watch(provider: EmoteProvider, channelId: string): void {
    const id = this.key(provider, channelId);
    if (!provider.watch || this.watching.has(id)) return;
    this.watching.set(
      id,
      provider.watch(
        channelId,
        (change) => void this.apply(provider, channelId, change),
      ),
    );
  }

  private async apply(
    provider: EmoteProvider,
    channelId: string,
    change: EmoteChange,
  ): Promise<void> {
    const id = this.key(provider, channelId);
    const before = this.channels.get(id) ?? [];
    if (change.kind === "reload") {
      await this.channel(provider, channelId);
    } else {
      this.channels.set(id, applyChange(before, change));
    }
    // closed in the meantime
    if (!this.watching.has(id)) return;

    const description = `${providerLabels[provider.name]} ${describe(
      change,
      before,
      this.channels.get(id) ?? [],
    )}`;
    const emotes = await this.compose(channelId);
    for (const listener of this.listeners) {
      listener(channelId, emotes, description);
    }
  }

  /** By position rather than name, providers are not required to differ */
  private key(provider: EmoteProvider, channelId: string): string {
    return `${this.providers.indexOf(provider)}/${channelId}`;
  }
}

const providerLabels: Record<EmoteProvider["name"], string> = {
  bttv: "BetterTTV",
  "7tv": "7TV",
};

/** For the console, e.g. `renamed "Old" to "New"` */
function describe(change: EmoteChange, before: Emote[], after: Emote[]) {
  const code = (id: string) => before.find((e) => e.id === id)?.code ?? id;
  switch (change.kind) {
    case "add":
      return `added "${change.emote.code}"`;
    case "remove":
      return `removed "${code(change.id)}"`;
    case "update": {
      const old = code(change.emote.id);
      return old === change.emote.code
        ? `updated "${old}"`
        : `renamed "${old}" to "${change.emote.code}"`;
    }
    case "reload":
      return `reloaded the list (${before.length} → ${after.length} emotes)`;
  }
}

function applyChange(
  list: Emote[],
  change: Exclude<EmoteChange, { kind: "reload" }>,
): Emote[] {
  switch (change.kind) {
    case "add":
      return [...list.filter((e) => e.id !== change.emote.id), change.emote];
    case "remove":
      return list.filter((e) => e.id !== change.id);
    case "update":
      return list.map((e) => (e.id === change.emote.id ? change.emote : e));
  }
}
