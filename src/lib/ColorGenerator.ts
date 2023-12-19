import { generateColor, generateSecondaryColor } from "@marko19907/string-to-color";

const cache = new Map<string, string>();

const ColorGenerator = {
    generate(seed: string) {
        if (cache.has(seed)) {
            return cache.get(seed);
        }

        const color = generateColor(seed);
        cache.set(seed, color);

        return color;
    }
}

export default ColorGenerator;