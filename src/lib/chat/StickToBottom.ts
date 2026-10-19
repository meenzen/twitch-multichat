/** The parts of a scrollable element StickToBottom needs */
export type Scroller = Pick<
  HTMLElement,
  | "scrollTop"
  | "scrollHeight"
  | "clientHeight"
  | "addEventListener"
  | "removeEventListener"
>;

export type StickToBottomOptions = {
  /** Distance from the bottom in px that still counts as "at the bottom" */
  threshold?: number;
  /** Elements whose size changes should keep the view pinned */
  observe?: Element[];
  ResizeObserver?: typeof ResizeObserver;
  onChange?: (following: boolean) => void;
};

const upKeys = new Set(["ArrowUp", "PageUp", "Home"]);

/**
 * Keeps a scroll container pinned to its newest (bottom) content while the
 * user follows along, and lets go as soon as they scroll up.
 *
 * Content growth never moves scrollTop up, so "scrollTop decreased while not
 * at the bottom" reliably means the user scrolled away. Getting back to the
 * bottom, by hand or via follow(), resumes following.
 */
export class StickToBottom {
  following = true;

  private readonly threshold: number;
  private readonly onChange?: (following: boolean) => void;
  private readonly resizeObserver?: ResizeObserver;
  private lastScrollTop: number;
  private touching = false;

  constructor(
    private readonly scroller: Scroller,
    options: StickToBottomOptions = {},
  ) {
    this.threshold = options.threshold ?? 10;
    this.onChange = options.onChange;
    this.lastScrollTop = scroller.scrollTop;

    scroller.addEventListener("scroll", this.onScroll, { passive: true });
    scroller.addEventListener("wheel", this.onWheel, { passive: true });
    scroller.addEventListener("keydown", this.onKeyDown);
    scroller.addEventListener("touchstart", this.onTouchStart, {
      passive: true,
    });
    scroller.addEventListener("touchend", this.onTouchEnd);
    scroller.addEventListener("touchcancel", this.onTouchEnd);

    const Observer = options.ResizeObserver ?? globalThis.ResizeObserver;
    if (Observer && options.observe?.length) {
      this.resizeObserver = new Observer(() => this.update());
      options.observe.forEach((element) =>
        this.resizeObserver!.observe(element),
      );
    }

    this.update();
  }

  /** Call after the content changed: scrolls to the bottom while following */
  update(): void {
    // moving the content under a finger fights the user's gesture
    if (this.following && !this.touching) {
      this.scrollToBottom();
    }
  }

  /** Jump to the newest content and follow it again */
  follow(): void {
    this.setFollowing(true);
    this.scrollToBottom();
  }

  destroy(): void {
    this.scroller.removeEventListener("scroll", this.onScroll);
    this.scroller.removeEventListener("wheel", this.onWheel);
    this.scroller.removeEventListener("keydown", this.onKeyDown);
    this.scroller.removeEventListener("touchstart", this.onTouchStart);
    this.scroller.removeEventListener("touchend", this.onTouchEnd);
    this.scroller.removeEventListener("touchcancel", this.onTouchEnd);
    this.resizeObserver?.disconnect();
  }

  private get distanceFromBottom(): number {
    const { scrollTop, scrollHeight, clientHeight } = this.scroller;
    return scrollHeight - clientHeight - scrollTop;
  }

  private scrollToBottom(): void {
    // browsers clamp this to the maximum scroll position
    this.scroller.scrollTop = this.scroller.scrollHeight;
    this.lastScrollTop = this.scroller.scrollTop;
  }

  private setFollowing(following: boolean): void {
    if (this.following !== following) {
      this.following = following;
      this.onChange?.(following);
    }
  }

  private onScroll = (): void => {
    const scrollTop = this.scroller.scrollTop;
    if (this.distanceFromBottom <= this.threshold) {
      this.setFollowing(true);
    } else if (scrollTop < this.lastScrollTop) {
      this.setFollowing(false);
    } else {
      // content grew or the container shrank before we could re-pin
      this.update();
    }
    this.lastScrollTop = this.scroller.scrollTop;
  };

  // Wheel and keyboard scrolling can be smooth: re-pinning while the
  // animation runs would cancel it, so let go right away.
  private onWheel = (event: WheelEvent): void => {
    if (event.deltaY < 0) {
      this.setFollowing(false);
    }
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (upKeys.has(event.key)) {
      this.setFollowing(false);
    }
  };

  private onTouchStart = (): void => {
    this.touching = true;
  };

  private onTouchEnd = (): void => {
    this.touching = false;
    this.update();
  };
}
