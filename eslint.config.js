import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";
import * as espree from "espree";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: {
          ts: ts.parser,
          js: espree,
          typescript: ts.parser,
        },
        svelteConfig,
      },
    },
  },
  {
    rules: {
      // Override or add rule settings here, such as:
      // 'svelte/rule-name': 'error'

      // see: https://github.com/sveltejs/kit/issues/14376 and https://github.com/sveltejs/eslint-plugin-svelte/issues/1324
      "svelte/no-navigation-without-resolve": "warn",
    },
  },
  {
    ignores: [
      "**/.svelte-kit/**",
      "**/build/**",
      "**/dist/**",
      "**/node_modules/**",
    ],
  },
);
