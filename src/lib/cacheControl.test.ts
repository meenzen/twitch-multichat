import { describe, expect, it } from "bun:test";
import { cacheControl } from "./cacheControl";

describe("cacheControl", () => {
  it("always revalidates chat pages, so a deploy can't serve an old build", () => {
    expect(cacheControl("GET", "/-/[...channels]", 200)).toBe("no-cache");
    expect(cacheControl("GET", "/dev/chat", 200)).toBe("no-cache");
  });

  it("caches preview images for a day", () => {
    expect(cacheControl("GET", "/images/preview.png", 200)).toBe(
      "public, max-age=86400, stale-while-revalidate=604800",
    );
  });

  it("does not cache errors of cached routes", () => {
    expect(cacheControl("GET", "/images/preview.png", 500)).toBe("no-store");
    expect(cacheControl("GET", "/-/[...channels]", 404)).toBe("no-store");
  });

  it("leaves other requests alone", () => {
    expect(cacheControl("POST", "/api/tunnel", 200)).toBeNull();
    expect(cacheControl("POST", "/images/preview.png", 200)).toBeNull();
    expect(cacheControl("GET", "/unknown", 200)).toBeNull();
    expect(cacheControl("GET", null, 404)).toBeNull();
  });
});
