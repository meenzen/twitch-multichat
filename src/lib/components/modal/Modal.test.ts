import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, screen } from "@testing-library/svelte";
import Modal from "./Modal.svelte";
import { ModalPriority, modalStack } from "./modalStack.svelte";

afterEach(cleanup);

describe("Modal", () => {
  it("shows the message with a spinner", () => {
    const { container } = render(Modal, { message: "Loading..." });

    expect(screen.getByRole("status").textContent).toContain("Loading...");
    expect(container.querySelector(".spinner")).toBeTruthy();
  });

  it("shows only one modal at a time, the newest wins", () => {
    render(Modal, { message: "first" });
    render(Modal, { message: "second" });

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain("second");
  });

  it("prefers higher priority over newer modals", () => {
    render(Modal, { message: "update", priority: ModalPriority.Update });
    render(Modal, { message: "joining", priority: ModalPriority.Chat });

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain("update");
  });

  it("reveals the next modal once the top one closes", () => {
    render(Modal, { message: "joining" });
    const update = render(Modal, {
      message: "update",
      priority: ModalPriority.Update,
    });
    expect(screen.getByRole("status").textContent).toContain("update");

    update.unmount();

    expect(screen.getByRole("status").textContent).toContain("joining");
  });

  it("leaves the stack once unmounted", () => {
    const { unmount } = render(Modal, { message: "bye" });
    expect(modalStack.size).toBe(1);

    unmount();

    expect(modalStack.size).toBe(0);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
