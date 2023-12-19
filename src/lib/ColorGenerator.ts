import chroma from "chroma-js";
import randomizer from "seedrandom";

const scale = chroma.scale("Spectral");

const ColorGenerator = {
    generate(seed: string) {
        const random = randomizer(seed);
        return scale(random()).hex();
    }
}

export default ColorGenerator;