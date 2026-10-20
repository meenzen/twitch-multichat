import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { plugin } from "bun";
import { inlinePlugin } from "./inlinePlugin";
import { sveltePlugin } from "./sveltePlugin";

GlobalRegistrator.register();

// Compile .svelte components and .svelte.ts rune modules for the test runtime
plugin(sveltePlugin());

// Vite asset imports
plugin(inlinePlugin());
