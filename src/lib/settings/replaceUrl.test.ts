import { describe, expect, it, mock } from "bun:test";

const goto = mock(() => Promise.resolve());
mock.module("$app/navigation", () => ({ goto }));
const { replaceUrl } = await import("./replaceUrl");

describe("replaceUrl", () => {
  it("replaces the history entry with a real navigation", async () => {
    const url = new URL("https://example.com/-/foo?size=large");
    await replaceUrl(url);

    // shallow entries come back without the settings on back/forward
    expect(goto).toHaveBeenCalledWith(url, { replace: true, reset: false });
  });
});
