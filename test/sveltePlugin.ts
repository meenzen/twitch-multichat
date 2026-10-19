import type { BunPlugin } from "bun";
import { compile, compileModule } from "svelte/compiler";

// Compiles .svelte components and .svelte.ts rune modules. Used by the unit
// test runtime and to bundle browser harnesses for the e2e tests.
export function sveltePlugin({ dev = true } = {}): BunPlugin {
  return {
    name: "svelte",
    setup(build) {
      const transpiler = new Bun.Transpiler({ loader: "ts" });

      build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
        const source = await Bun.file(path).text();
        const result = compile(source, {
          filename: path,
          generate: "client",
          dev,
          css: "injected",
        });
        return { contents: result.js.code, loader: "js" };
      });

      build.onLoad({ filter: /\.svelte\.[jt]s$/ }, async ({ path }) => {
        let source = await Bun.file(path).text();
        if (path.endsWith(".ts")) {
          source = transpiler.transformSync(source);
        }
        const result = compileModule(source, {
          filename: path,
          generate: "client",
          dev,
        });
        return { contents: result.js.code, loader: "js" };
      });
    },
  };
}
