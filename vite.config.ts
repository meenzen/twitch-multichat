import { sentryVitePlugin } from '@sentry/vite-plugin'
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import {SvelteKitPWA} from "@vite-pwa/sveltekit";

export default defineConfig({
	build: {
		sourcemap: true
	},
	plugins: [
		sentryVitePlugin({
			org: "meenzen",
			project: "twitch-multichat",
			url: "https://sentry.mnzn.dev",
			authToken: process.env.SENTRY_AUTH_TOKEN,
			telemetry: false,
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
			},
			injectManifest: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
			},
			workbox: {
				cleanupOutdatedCaches: true,
				skipWaiting: true,
				clientsClaim: true,
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
			},
			pwaAssets: {
				image: "static/logo.svg",
			},
		})
	],
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"]
	}
});
