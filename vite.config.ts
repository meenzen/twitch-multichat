import { sentrySvelteKit } from "@sentry/sveltekit/vite";
import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { sveltekitOG } from "@ethercorps/sveltekit-og/plugin";

export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    sentrySvelteKit({
      org: "meenzen",
      project: "twitch-multichat",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      adapter: "cloudflare",
    }),
    enhancedImages(),
    sveltekit({
      adapter: adapter(),
      preprocess: vitePreprocess(),
      compilerOptions: {
        runes: true,
      },
      paths: {
        relative: false,
      },
    }),
    sveltekitOG(),
  ],
});
