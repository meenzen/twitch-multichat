import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    serviceWorker: {
      register: false,
    },
    files: {
      serviceWorker: "src/service-worker.ts",
    },
    paths: {
      relative: false,
    },
    experimental: {
      instrumentation: {
        server: true,
      },
    },
  },

  compilerOptions: {
    runes: true,
  },
};

export default config;
