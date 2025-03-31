const ElementChecker = {
  isScrollable(target: HTMLElement | null): boolean {
    if (!target) {
      return false;
    }

    if (target.scrollHeight > target.clientHeight) {
      return true;
    }

    // if the chat window is taller than the screen, it's definitely scrollable
    // this happens when the chat window doesn't have a height set
    if (target.scrollHeight > window.innerHeight) {
      return true;
    }

    return false;
  },

  isVisible(target: HTMLElement | null): boolean {
    if (!target) {
      return false;
    }

    const rect = target.getBoundingClientRect();

    if (rect.top < 0) {
      return false;
    }

    if (rect.bottom > window.innerHeight) {
      return false;
    }

    if (rect.left < 0) {
      return false;
    }

    if (rect.right > window.innerWidth) {
      return false;
    }

    return true;
  },
};

export default ElementChecker;
