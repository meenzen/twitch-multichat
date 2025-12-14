const cache = new Map<string, string>();

// Golden ratio for better color distribution
const PHI = 1.618033988749895;

/**
 * Hash function to convert a string to a number with good distribution
 * Uses MurmurHash-inspired algorithm for better avalanche effect
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Additional mixing for better distribution
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  
  // Normalize to 0-1 range using unsigned 32-bit integer
  return (hash >>> 0) / 4294967296;
}

/**
 * Generates a deterministic HSL color from a string
 * Uses the golden ratio for better color distribution
 * @param seed - The input string to generate a color from
 * @returns HSL color string in format "hsl(hue, saturation%, lightness%, alpha%)"
 */
function generateColor(seed: string): string {
  const hash = hashString(seed);
  // Use golden ratio for better hue distribution
  const hue = Math.floor(((hash + 1 / PHI) % 1) * 360);
  
  // Use fixed saturation and lightness values for nice, readable colors
  const saturation = 75;
  const lightness = 50;
  const alpha = 100;
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%, ${alpha}%)`;
}

const ColorGenerator = {
  generate(seed: string) {
    if (cache.has(seed)) {
      return cache.get(seed);
    }

    const color = generateColor(seed);
    cache.set(seed, color);

    return color;
  },
};

export default ColorGenerator;
