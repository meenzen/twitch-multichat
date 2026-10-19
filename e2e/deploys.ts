import { cp, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

// Real builds of the app ("deploys") in .e2e/<name>, shared by the e2e
// tests. bun runs all test files in one process, so each deploy is built
// once per run.
//
// Set E2E_REUSE_BUILD=1 to skip building deploys that already exist.

export const root = resolve(import.meta.dir, "..");
export const deploys = join(root, ".e2e");

const builds = new Map<string, Promise<void>>();
let queue: Promise<unknown> = Promise.resolve();

async function build(name: string) {
  const proc = Bun.spawn(["bun", "run", "build"], {
    cwd: root,
    stdout: "ignore",
    stderr: "inherit",
  });
  if ((await proc.exited) !== 0) throw new Error(`build ${name} failed`);
  await rm(join(deploys, name), { recursive: true, force: true });
  await cp(join(root, ".svelte-kit/cloudflare"), join(deploys, name), {
    recursive: true,
  });
}

/**
 * Builds the deploy `name` unless it was built earlier in this run (or
 * exists and E2E_REUSE_BUILD is set). Each call to a new name makes a new
 * build, so two names are two deploys with different versions.
 */
export function ensureDeploy(name: string): Promise<void> {
  let pending = builds.get(name);
  if (!pending) {
    // one build at a time: they share .svelte-kit
    pending = queue.then(async () => {
      await mkdir(deploys, { recursive: true });
      const reuse =
        process.env.E2E_REUSE_BUILD &&
        (await Bun.file(join(deploys, name, "_app/version.json")).exists());
      if (!reuse) await build(name);
    });
    queue = pending.catch(() => {});
    builds.set(name, pending);
  }
  return pending;
}

export async function versionOf(name: string): Promise<string> {
  const file = Bun.file(join(deploys, name, "_app/version.json"));
  return (await file.json()).version;
}
