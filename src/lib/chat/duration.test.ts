import { describe, expect, it } from "bun:test";
import { formatClock, formatDuration } from "./duration";

describe("formatDuration", () => {
  it("shows seconds below a minute", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(42_400)).toBe("42s");
  });

  it("shows minutes and seconds below an hour", () => {
    expect(formatDuration(133_000)).toBe("2m 13s");
    expect(formatDuration(59 * 60_000 + 59_600)).toBe("1h 0m");
  });

  it("shows hours and minutes above an hour", () => {
    expect(formatDuration(3_900_000)).toBe("1h 5m");
  });

  it("never goes negative", () => {
    expect(formatDuration(-5000)).toBe("0s");
  });
});

describe("formatClock", () => {
  it("shows local 24-hour time with leading zeros", () => {
    expect(formatClock(new Date(2026, 0, 1, 9, 5).getTime())).toBe("09:05");
    expect(formatClock(new Date(2026, 0, 1, 23, 59, 59).getTime())).toBe(
      "23:59",
    );
  });
});
