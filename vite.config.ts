import cloudflareAdapter from "@sveltejs/adapter-cloudflare";
import nodeAdapter from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { sveltekitOG } from "@ethercorps/sveltekit-og/plugin";

// Cloudflare Pages by default. ADAPTER=node builds a server for the NixOS
// package (nix/package.nix), run with Bun.
const adapter =
  process.env.ADAPTER === "node"
    ? nodeAdapter({ precompress: true })
    : cloudflareAdapter({
        // 404.html is the app shell instead of "Not Found". Once the
        // Functions limit is used up, Pages serves only static files and
        // chat pages get 404.html, so the chat still works client-side.
        // See e2e/functions-limit.test.ts.
        fallback: "spa",
      });

export default defineConfig({
  plugins: [
    enhancedImages(),
    sveltekit({
      adapter,
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
