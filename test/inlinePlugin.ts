import type { BunPlugin } from "bun";
import { dirname } from "node:path";

// Vite's `<file>?inline`: the file as a base64 data URL.
export function inlinePlugin(): BunPlugin {
  return {
    name: "inline",
    setup(build) {
      build.onResolve({ filter: /\?inline$/ }, ({ path, importer }) => ({
        path: Bun.resolveSync(path.replace(/\?inline$/, ""), dirname(importer)),
        namespace: "inline",
      }));
      build.onLoad({ filter: /.*/, namespace: "inline" }, async ({ path }) => {
        const file = Bun.file(path);
        const base64 = Buffer.from(await file.bytes()).toString("base64");
        const url = `data:${file.type};base64,${base64}`;
        return {
          contents: `export default ${JSON.stringify(url)};`,
          loader: "js",
        };
      });
    },
  };
}
