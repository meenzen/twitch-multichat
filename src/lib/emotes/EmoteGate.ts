import type { EmoteMap } from "./Emote";

type Held = (emotes: EmoteMap) => void;

const noEmotes: EmoteMap = new Map();

/**
 * Holds a channel's chat events until its emotes are loaded, so the first
 * messages after joining show emotes too. Events keep their order, removals
 * included, so a removal can't overtake the message it removes. After
 * `timeoutMs` the events go through without emotes; the list is still used
 * for later messages once it arrives.
 */
export class EmoteGate {
  private emotes = new Map<string, EmoteMap>();
  private held = new Map<string, Held[]>();

  constructor(
    private readonly loadEmotes: (channelId: string) => Promise<EmoteMap>,
    private readonly timeoutMs = 3000,
  ) {}

  /** Load a channel's emotes unless they are loaded or loading already */
  ensure(channel: string, channelId: string): void {
    if (!this.emotes.has(channel) && !this.held.has(channel)) {
      this.load(channel, channelId);
    }
  }

  /**
   * (Re)load a channel's emotes, e.g. after rejoining. Events are only held
   * while a channel has no emotes yet.
   */
  load(channel: string, channelId: string): void {
    const first = !this.emotes.has(channel) && !this.held.has(channel);
    const loading = this.loadEmotes(channelId).then(
      (emotes) => void this.emotes.set(channel, emotes),
      (error: unknown) => console.warn("Failed to load emotes:", error),
    );
    if (!first) return;

    this.held.set(channel, []);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        console.warn(`Emotes of ${channel} are slow, continuing without`);
        resolve();
      }, this.timeoutMs);
    });
    void Promise.race([loading, timeout]).then(() => {
      clearTimeout(timer);
      this.release(channel);
    });
  }

  /** New emotes for a channel that is loaded or loading, e.g. live changes */
  update(channel: string, emotes: EmoteMap): void {
    if (this.emotes.has(channel) || this.held.has(channel)) {
      this.emotes.set(channel, emotes);
    }
  }

  /** Run `event` with the channel's emotes, after its held events */
  run(channel: string, event: Held): void {
    const held = this.held.get(channel);
    if (held) {
      held.push(event);
    } else {
      event(this.emotes.get(channel) ?? noEmotes);
    }
  }

  private release(channel: string): void {
    const held = this.held.get(channel) ?? [];
    this.held.delete(channel);
    const emotes = this.emotes.get(channel) ?? noEmotes;
    for (const event of held) event(emotes);
  }
}
