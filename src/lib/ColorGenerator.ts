import chroma from "chroma-js";
import randomizer from "seedrandom";

const scale = chroma.scale("Spectral");
const cache = new Map<string, string>();

const ColorGenerator = {
    generate(seed: string) {
        if (cache.has(seed)) {
            return cache.get(seed);
        }

        const random = randomizer(seed);

        const color = scale(random()).hex();
        cache.set(seed, color);

        return color;
    }
}

export default ColorGenerator;