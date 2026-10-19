import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { plugin } from "bun";
import { compile, compileModule } from "svelte/compiler";

GlobalRegistrator.register();

// Compile .svelte components and .svelte.ts rune modules for the test runtime
plugin({
  name: "svelte",
  setup(build) {
    const transpiler = new Bun.Transpiler({ loader: "ts" });

    build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
      const source = await Bun.file(path).text();
      const result = compile(source, {
        filename: path,
        generate: "client",
        dev: true,
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
        dev: true,
      });
      return { contents: result.js.code, loader: "js" };
    });
  },
});
