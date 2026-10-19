import { describe, expect, it } from "bun:test";
import { StickToBottom } from "./StickToBottom";

/**
 * Scroll container without layout: scrollTop is clamped like in a browser and
 * every change dispatches a scroll event, synchronously for simplicity.
 */
class FakeScroller extends EventTarget {
  scrollHeight: number;
  private top = 0;

  constructor(
    contentHeight: number,
    public clientHeight = 100,
  ) {
    super();
    this.scrollHeight = Math.max(contentHeight, clientHeight);
  }

  get scrollTop(): number {
    return this.top;
  }

  set scrollTop(value: number) {
    const max = this.scrollHeight - this.clientHeight;
    const next = Math.min(Math.max(value, 0), max);
    if (next !== this.top) {
      this.top = next;
      this.dispatchEvent(new Event("scroll"));
    }
  }

  get atBottom(): boolean {
    return this.top === this.scrollHeight - this.clientHeight;
  }

  /** Content changed, like a message being added or removed */
  setContentHeight(height: number): void {
    this.scrollHeight = Math.max(height, this.clientHeight);
    // shrinking content clamps the position, which scrolls
    this.scrollTop = this.top;
  }

  /** User scrolls by the given delta (negative = up) */
  userScroll(delta: number): void {
    this.scrollTop = this.top + delta;
  }

  fire(type: string, init: Record<string, unknown> = {}): void {
    this.dispatchEvent(Object.assign(new Event(type), init));
  }
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  disconnected = false;

  constructor(readonly callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.observed.push(element);
  }

  disconnect(): void {
    this.disconnected = true;
  }
}

function setup(contentHeight = 1000) {
  const scroller = new FakeScroller(contentHeight);
  const changes: boolean[] = [];
  const stick = new StickToBottom(scroller as unknown as HTMLElement, {
    onChange: (following) => changes.push(following),
  });
  return { scroller, stick, changes };
}

describe("StickToBottom", () => {
  it("starts pinned to the bottom", () => {
    const { scroller, stick } = setup();

    expect(stick.following).toBe(true);
    expect(scroller.atBottom).toBe(true);
  });

  it("follows new content", () => {
    const { scroller, stick } = setup();

    scroller.setContentHeight(1200);
    stick.update();

    expect(scroller.atBottom).toBe(true);
    expect(stick.following).toBe(true);
  });

  it("stays following when content grew before update() ran", () => {
    const { scroller, stick, changes } = setup();

    // e.g. the container shrank, or a browser scroll event raced the render
    scroller.setContentHeight(1200);
    scroller.fire("scroll");

    expect(stick.following).toBe(true);
    expect(scroller.atBottom).toBe(true);
    expect(changes).toEqual([]);
  });

  it("stays following when messages are removed", () => {
    const { scroller, stick } = setup();

    scroller.setContentHeight(800);
    stick.update();

    expect(stick.following).toBe(true);
    expect(scroller.atBottom).toBe(true);
  });

  it("lets go when the user scrolls up and keeps the position", () => {
    const { scroller, stick, changes } = setup();

    scroller.userScroll(-300);
    expect(stick.following).toBe(false);
    expect(changes).toEqual([false]);

    const position = scroller.scrollTop;
    scroller.setContentHeight(1500);
    stick.update();

    expect(scroller.scrollTop).toBe(position);
  });

  it("ignores tiny movements near the bottom", () => {
    const { scroller, stick } = setup();

    scroller.userScroll(-5);

    expect(stick.following).toBe(true);
  });

  it("resumes when the user scrolls back to the bottom", () => {
    const { scroller, stick, changes } = setup();
    scroller.userScroll(-300);

    scroller.userScroll(300);

    expect(stick.following).toBe(true);
    expect(changes).toEqual([false, true]);
  });

  it("follow() jumps to the bottom and resumes", () => {
    const { scroller, stick } = setup();
    scroller.userScroll(-300);
    scroller.setContentHeight(2000);

    stick.follow();

    expect(stick.following).toBe(true);
    expect(scroller.atBottom).toBe(true);
  });

  it("lets go on wheel up before the smooth scroll moved anything", () => {
    const { scroller, stick } = setup();

    scroller.fire("wheel", { deltaY: 100 });
    expect(stick.following).toBe(true);

    scroller.fire("wheel", { deltaY: -100 });
    expect(stick.following).toBe(false);

    scroller.setContentHeight(1200);
    stick.update();
    expect(scroller.atBottom).toBe(false);
  });

  it("lets go on keys that scroll up", () => {
    const { scroller, stick } = setup();

    scroller.fire("keydown", { key: "ArrowDown" });
    expect(stick.following).toBe(true);

    scroller.fire("keydown", { key: "PageUp" });
    expect(stick.following).toBe(false);
  });

  it("does not move the content while a finger is on the screen", () => {
    const { scroller, stick } = setup();

    scroller.fire("touchstart");
    scroller.setContentHeight(1200);
    stick.update();
    expect(scroller.atBottom).toBe(false);

    // the user just tapped, so catch up afterwards
    scroller.fire("touchend");
    expect(scroller.atBottom).toBe(true);
    expect(stick.following).toBe(true);
  });

  it("does not snap back after a swipe up", () => {
    const { scroller, stick } = setup();

    scroller.fire("touchstart");
    scroller.userScroll(-50);
    scroller.userScroll(-100);
    scroller.fire("touchend");
    // momentum keeps scrolling after the finger left
    scroller.userScroll(-100);
    scroller.setContentHeight(1200);
    stick.update();

    expect(stick.following).toBe(false);
    expect(scroller.scrollTop).toBe(650);
  });

  it("re-pins when observed elements resize", () => {
    FakeResizeObserver.instances = [];
    const scroller = new FakeScroller(1000);
    const content = {} as Element;
    const stick = new StickToBottom(scroller as unknown as HTMLElement, {
      observe: [content],
      ResizeObserver: FakeResizeObserver as unknown as typeof ResizeObserver,
    });
    const [observer] = FakeResizeObserver.instances;
    expect(observer.observed).toEqual([content]);

    // e.g. an emote finished loading
    scroller.setContentHeight(1100);
    observer.callback();
    expect(scroller.atBottom).toBe(true);

    stick.destroy();
    expect(observer.disconnected).toBe(true);
  });

  it("stops listening after destroy()", () => {
    const { scroller, stick } = setup();
    stick.destroy();

    scroller.userScroll(-300);

    expect(stick.following).toBe(true);
  });
});
