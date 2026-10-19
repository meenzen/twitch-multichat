import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
  mock,
} from "bun:test";
import { cleanup, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import UpdateNotifier from "./UpdateNotifier.svelte";
import ChatView from "#lib/chat/ChatView.svelte";
import { fakeServiceWorker, flush } from "../../../test/fakeServiceWorker";

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

async function setup() {
  const sw = fakeServiceWorker();
  const reload = mock();
  render(UpdateNotifier, { navigator: sw.navigator, reload });
  sw.container.becomeReady();
  await flush();
  return { ...sw, reload };
}

describe("UpdateNotifier", () => {
  it("shows nothing while there is no update", async () => {
    await setup();

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a modal while the update installs, then reloads", async () => {
    const { registration, container, reload } = await setup();

    registration.findUpdate();
    await tick();
    expect(screen.getByRole("status").textContent).toContain(
      "Installing update...",
    );

    container.takeControl();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("hides the modal again when the install fails", async () => {
    const { registration, reload } = await setup();

    registration.findUpdate().setState("redundant");
    await tick();

    expect(screen.queryByRole("status")).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it("covers the chat loading modal instead of overlapping it", async () => {
    const { registration } = await setup();
    render(ChatView, {
      messages: [],
      status: { kind: "joining", channel: "foo" },
    });
    expect(screen.getByRole("status").textContent).toContain("Joining: foo...");

    registration.findUpdate();
    await tick();

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toContain(
      "Installing update...",
    );
  });
});
