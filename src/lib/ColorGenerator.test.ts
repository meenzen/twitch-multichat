import { describe, it, expect } from "vitest";
import ColorGenerator from "./ColorGenerator";

describe("ColorGenerator", () => {
  it("generates deterministic colors for the same input", () => {
    const input = "testuser";
    const color1 = ColorGenerator.generate(input);
    const color2 = ColorGenerator.generate(input);
    expect(color1).toBe(color2);
  });

  it("generates different colors for different inputs", () => {
    const color1 = ColorGenerator.generate("user1");
    const color2 = ColorGenerator.generate("user2");
    expect(color1).not.toBe(color2);
  });

  it("generates valid HSL color strings", () => {
    const color = ColorGenerator.generate("testuser");
    // HSL format: hsl(hue, saturation%, lightness%, alpha%)
    expect(color).toMatch(/^hsl\(\s*\d+\s*,\s*\d+%,\s*\d+%,\s*\d+%\s*\)$/);
  });

  it("uses cache for repeated calls", () => {
    const input = "cached-user";
    const color1 = ColorGenerator.generate(input);
    const color2 = ColorGenerator.generate(input);
    expect(color1).toBe(color2);
  });

  it("generates colors with reasonable saturation and lightness", () => {
    const color = ColorGenerator.generate("testuser");
    // Extract saturation and lightness from HSL string
    const match = color.match(/hsl\(\s*\d+\s*,\s*(\d+)%,\s*(\d+)%,\s*(\d+)%\s*\)/);
    expect(match).not.toBeNull();
    if (match) {
      const saturation = parseInt(match[1], 10);
      const lightness = parseInt(match[2], 10);
      const alpha = parseInt(match[3], 10);
      
      // Saturation should be between 50-100 for vibrant colors
      expect(saturation).toBeGreaterThanOrEqual(50);
      expect(saturation).toBeLessThanOrEqual(100);
      
      // Lightness should be between 40-60 for readable colors
      expect(lightness).toBeGreaterThanOrEqual(40);
      expect(lightness).toBeLessThanOrEqual(60);
      
      // Alpha should be 100 (fully opaque)
      expect(alpha).toBe(100);
    }
  });
});
