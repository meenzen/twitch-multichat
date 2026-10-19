import { afterEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import ChatScreen from "./ChatScreen.svelte";
import SettingsDialog from "#lib/settings/SettingsDialog.svelte";
import { Settings } from "#lib/settings/Settings.svelte.ts";

afterEach(cleanup);

const children = createRawSnippet(() => ({
  render: () => `<div>chat</div>`,
}));

function setup(settings = new Settings()) {
  render(ChatScreen, {
    channels: ["foo", "bar"],
    settings,
    homeHref: "/home",
    children,
  });
  const dialog = () => document.querySelector("dialog") as HTMLDialogElement;
  return { settings, dialog };
}

const escape = () => fireEvent.keyDown(window, { key: "Escape" });

describe("ChatScreen", () => {
  it("links back to the landing page", () => {
    setup();
    const link = screen.getByRole("link", {
      name: "Back to channel selection",
    });
    expect(link.getAttribute("href")).toBe("/home");
  });

  it("opens and closes the settings with the button", async () => {
    const { dialog } = setup();
    const button = screen.getByRole("button", { name: "Settings" });
    expect(dialog().open).toBe(false);

    await fireEvent.click(button);
    await tick();
    expect(dialog().open).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");

    await fireEvent.click(
      screen.getByRole("button", { name: "Close settings" }),
    );
    await tick();
    expect(dialog().open).toBe(false);
  });

  it("toggles the settings with Escape", async () => {
    const { dialog } = setup();

    await escape();
    await tick();
    expect(dialog().open).toBe(true);

    await escape();
    await tick();
    expect(dialog().open).toBe(false);
  });

  it("ignores Escape with modifiers", async () => {
    const { dialog } = setup();
    await fireEvent.keyDown(window, { key: "Escape", ctrlKey: true });
    await tick();
    expect(dialog().open).toBe(false);
  });

  it("changes settings from the dialog", async () => {
    const { settings } = setup();
    await escape();
    await tick();

    await fireEvent.click(screen.getByLabelText("Show timestamps"));
    await fireEvent.click(screen.getByLabelText("Show channel name"));
    await fireEvent.click(screen.getByLabelText("Large"));
    await tick();

    expect(settings.values).toMatchObject({
      timestamps: true,
      channelTag: false,
      fontSize: "large",
    });

    await fireEvent.click(
      screen.getByRole("button", { name: "Reset to defaults" }),
    );
    await tick();
    expect(settings.values).toMatchObject({
      timestamps: false,
      channelTag: true,
      fontSize: "small",
    });
    expect(
      (screen.getByLabelText("Show timestamps") as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("shows only the chat in overlay mode", async () => {
    const { dialog } = setup(new Settings({ overlay: true }));

    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
    expect(screen.getByText("chat")).toBeTruthy();
    expect(document.documentElement.classList.contains("overlay")).toBe(true);

    await escape();
    await tick();
    expect(dialog()).toBeNull();
  });
});

describe("SettingsDialog", () => {
  function renderDialog(clipboard: Pick<Clipboard, "writeText">) {
    const settings = new Settings({ fontSize: "medium" });
    render(SettingsDialog, {
      settings,
      open: true,
      clipboard,
      currentUrl: () => new URL("https://example.com/-/foo?size=medium"),
    });
    return settings;
  }

  it("copies the overlay URL", async () => {
    const writeText = mock(() => Promise.resolve());
    renderDialog({ writeText });
    const expected = "https://example.com/-/foo?size=medium&overlay=true";

    expect(
      (screen.getByLabelText("Overlay URL") as HTMLInputElement).value,
    ).toBe(expected);

    await fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await tick();

    expect(writeText).toHaveBeenCalledWith(expected);
    expect(screen.getByRole("status").textContent).toContain("copied");
  });

  it("links to the source code in a new tab", () => {
    renderDialog({ writeText: () => Promise.resolve() });
    const link = screen.getByRole("link", { name: "Source on GitHub" });
    expect(link.getAttribute("href")).toBe(
      "https://github.com/meenzen/twitch-multichat",
    );
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("asks for a manual copy without clipboard access", async () => {
    renderDialog({ writeText: () => Promise.reject(new Error("denied")) });

    await fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await tick();

    expect(screen.getByRole("status").textContent).toContain("Ctrl+C");
  });
});
