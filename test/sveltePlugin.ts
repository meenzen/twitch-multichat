import type { BunPlugin } from "bun";
import { dirname } from "node:path";
import { compile, compileModule } from "svelte/compiler";

// Compiles .svelte components and .svelte.ts rune modules. Used by the unit
// test runtime and to bundle browser harnesses for the e2e tests.
//
// Components are compiled for the browser. Import `<path>.svelte?server` to
// get one compiled for `svelte/server` instead (link preview images).
export function sveltePlugin({ dev = true } = {}): BunPlugin {
  return {
    name: "svelte",
    setup(build) {
      const transpiler = new Bun.Transpiler({ loader: "ts" });

      // A namespace of its own: Bun caches modules by path, so the server
      // build needs a path of its own. Bun does not resolve imports from
      // modules in other namespaces, so they are resolved here to absolute
      // file paths (components to their server build).
      build.onResolve(
        { filter: /\.svelte\?server$/ },
        ({ path, importer }) => ({
          path: Bun.resolveSync(
            path.replace(/\?server$/, ""),
            dirname(importer),
          ),
          namespace: "svelte-server",
        }),
      );
      build.onLoad(
        { filter: /.*/, namespace: "svelte-server" },
        async ({ path }) => {
          const source = await Bun.file(path).text();
          const result = compile(source, {
            filename: path,
            generate: "server",
            dev,
            css: "injected",
          });
          const contents = result.js.code.replace(
            /(from |import )(["'])([^"']+)\2/g,
            (_, keyword, quote, specifier: string) => {
              let resolved = Bun.resolveSync(specifier, dirname(path));
              if (resolved.endsWith(".svelte")) resolved += "?server";
              return `${keyword}${quote}${resolved}${quote}`;
            },
          );
          return { contents, loader: "js" };
        },
      );

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
