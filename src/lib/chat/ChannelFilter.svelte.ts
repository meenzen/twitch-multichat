/**
 * Which channels are shown, toggled by clicking them in the channel list.
 *
 * With all channels shown, a click shows only that channel. While filtered,
 * a click adds a hidden channel or hides a shown one. Hiding the last one or
 * showing all of them goes back to showing everything. Not persisted.
 */
export class ChannelFilter {
  /** Lowercase names of the shown channels, null while all are shown */
  private shown: readonly string[] | null = $state.raw(null);
  private readonly channels: readonly string[];

  constructor(channels: string[]) {
    this.channels = channels.map(normalize);
  }

  get active(): boolean {
    return this.shown !== null;
  }

  isShown(channel: string): boolean {
    return this.shown?.includes(normalize(channel)) ?? true;
  }

  toggle(channel: string): void {
    const c = normalize(channel);
    if (this.shown === null) {
      this.shown = [c];
      return;
    }

    const next = this.shown.includes(c)
      ? this.shown.filter((name) => name !== c)
      : [...this.shown, c];

    const all = this.channels.every((name) => next.includes(name));
    this.shown = next.length === 0 || all ? null : next;
  }

  showAll(): void {
    this.shown = null;
  }
}

function normalize(channel: string): string {
  return channel.replace(/^#/, "").toLowerCase();
}
