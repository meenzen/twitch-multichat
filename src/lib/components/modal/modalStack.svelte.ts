import { untrack } from "svelte";

// Every open <Modal> registers here. Only the top entry is rendered, so
// modals never overlap: higher priority wins, on a tie the newest one.

export const ModalPriority = {
  Chat: 0,
  Update: 10,
} as const;

type Entry = { id: symbol; priority: number; order: number };

class ModalStack {
  private entries: Entry[] = $state.raw([]);
  private counter = 0;

  get top(): symbol | undefined {
    let best: Entry | undefined;
    for (const entry of this.entries) {
      if (
        !best ||
        entry.priority > best.priority ||
        (entry.priority === best.priority && entry.order > best.order)
      ) {
        best = entry;
      }
    }
    return best?.id;
  }

  get size(): number {
    return this.entries.length;
  }

  // open/close are called from effects: don't let them subscribe to the stack
  open(id: symbol, priority: number): void {
    untrack(() => {
      this.entries = [
        ...this.entries.filter((entry) => entry.id !== id),
        { id, priority, order: ++this.counter },
      ];
    });
  }

  close(id: symbol): void {
    untrack(() => {
      this.entries = this.entries.filter((entry) => entry.id !== id);
    });
  }
}

export const modalStack = new ModalStack();
