import { describe, expect, it } from "bun:test";
import { brokenStorage, fakeStorage } from "../../test/fakeStorage";
import {
  addRecent,
  loadRecent,
  maxRecent,
  removeRecent,
} from "./RecentChannels";

describe("recent channels", () => {
  it("are empty at first", () => {
    expect(loadRecent(fakeStorage())).toEqual([]);
    expect(loadRecent(undefined)).toEqual([]);
  });

  it("keep the newest selection first", () => {
    const storage = fakeStorage();
    addRecent(storage, ["a1", "b1"]);
    addRecent(storage, ["c1"]);
    expect(loadRecent(storage)).toEqual([["c1"], ["a1", "b1"]]);
  });

  it("move a selection opened again to the front, in its new order", () => {
    const storage = fakeStorage();
    addRecent(storage, ["a1", "b1"]);
    addRecent(storage, ["c1"]);
    expect(addRecent(storage, ["B1", "a1"])).toEqual([["B1", "a1"], ["c1"]]);
  });

  it(`keep at most ${maxRecent}`, () => {
    const storage = fakeStorage();
    for (let i = 0; i < maxRecent + 2; i++) {
      addRecent(storage, [`channel${i}`]);
    }
    const recent = loadRecent(storage);
    expect(recent).toHaveLength(maxRecent);
    expect(recent[0]).toEqual([`channel${maxRecent + 1}`]);
  });

  it("can be removed", () => {
    const storage = fakeStorage();
    addRecent(storage, ["a1"]);
    addRecent(storage, ["b1"]);
    expect(removeRecent(storage, ["a1"])).toEqual([["b1"]]);
    expect(loadRecent(storage)).toEqual([["b1"]]);
  });

  it("ignore broken or invalid stored data", () => {
    expect(loadRecent(fakeStorage({ recentChannels: "{nope" }))).toEqual([]);
    expect(loadRecent(fakeStorage({ recentChannels: '{"a":1}' }))).toEqual([]);
    expect(
      loadRecent(
        fakeStorage({
          recentChannels: JSON.stringify([
            ["ok1"],
            [],
            ["no spaces"],
            [3],
            "x",
          ]),
        }),
      ),
    ).toEqual([["ok1"]]);
  });

  it("survive a storage that throws", () => {
    expect(addRecent(brokenStorage, ["a1"])).toEqual([["a1"]]);
    expect(loadRecent(brokenStorage)).toEqual([]);
  });
});
