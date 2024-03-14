import { sentryVitePlugin } from '@sentry/vite-plugin'
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

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
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
