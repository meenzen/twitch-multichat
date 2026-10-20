import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

// Compares a PNG to a known good one in `__snapshots__/<name>.png` next to
// the test, pixel by pixel. The renderers are WebAssembly and render the
// same everywhere, so colours must match exactly (pixelmatch's default
// threshold lets text colour changes through). Only anti-aliased pixels
// that pixelmatch detects as such may differ.
//
// A missing snapshot is written (except on CI, where it fails). To accept a
// changed image, run the tests with UPDATE_SNAPSHOTS=1 and review the new
// files. On a mismatch, `<name>.actual.png` and `<name>.diff.png` (changed
// pixels in red) are written next to the snapshot.
export async function expectImageSnapshot(
  testFile: string,
  name: string,
  png: ArrayBuffer | Uint8Array,
): Promise<void> {
  const base = join(dirname(testFile), "__snapshots__", name);
  const snapshotFile = Bun.file(`${base}.png`);
  const actualFile = `${base}.actual.png`;
  const diffFile = `${base}.diff.png`;
  await rm(actualFile, { force: true });
  await rm(diffFile, { force: true });

  const bytes = new Uint8Array(png);
  if (process.env.UPDATE_SNAPSHOTS || !(await snapshotFile.exists())) {
    if (process.env.CI && !process.env.UPDATE_SNAPSHOTS) {
      throw new Error(`Missing image snapshot ${base}.png`);
    }
    await mkdir(dirname(base), { recursive: true });
    await Bun.write(snapshotFile, bytes);
    return;
  }

  const expected = PNG.sync.read(Buffer.from(await snapshotFile.bytes()));
  const actual = PNG.sync.read(Buffer.from(bytes));
  const { width, height } = expected;
  if (actual.width !== width || actual.height !== height) {
    await Bun.write(actualFile, bytes);
    throw new Error(
      `${name}: size ${actual.width}x${actual.height}, expected ${width}x${height} (see ${actualFile})`,
    );
  }

  const diff = new PNG({ width, height });
  const changed = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    width,
    height,
    { threshold: 0 },
  );
  if (changed > 0) {
    await Bun.write(actualFile, bytes);
    await Bun.write(diffFile, PNG.sync.write(diff));
    throw new Error(
      `${name}: ${changed} pixels differ from the snapshot (see ${actualFile} and ${diffFile})`,
    );
  }
}
