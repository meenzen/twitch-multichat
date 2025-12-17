import { sentrySvelteKit } from "@sentry/sveltekit";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";

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
    sveltekit(),
    SvelteKitPWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "service-worker.ts",
      manifest: {
        short_name: "Twitch Multichat",
        name: "Twitch Multichat",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#9146ff",
        background_color: "#0e0e10",
        lang: "en",
        icons: [
          {
            src: "logo-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "logo-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["client/**/*.{js,css,ico,png,svg,webp,woff,woff2}"],
      },
      workbox: {
        globPatterns: ["client/**/*.{js,css,ico,png,svg,webp,woff,woff2}"],
      },
    }),
  ],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
