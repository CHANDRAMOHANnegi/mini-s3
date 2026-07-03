import assert from "node:assert/strict";
import { test } from "node:test";
import { createShare } from "../domain/shares.js";
import { createMemoryShareStore } from "./shareStore.js";

test("memory share store saves and finds shares by id", async () => {
  const store = createMemoryShareStore();
  const share = createShare({ name: "Client upload" }, new Date("2026-07-03T10:00:00.000Z"));

  await store.create(share);

  assert.deepEqual(await store.findById(share.id), share);
  assert.equal(await store.findById("missing"), null);
});

test("memory share store lists newest shares first", async () => {
  const store = createMemoryShareStore();
  const older = createShare({ name: "Older" }, new Date("2026-07-03T09:00:00.000Z"));
  const newer = createShare({ name: "Newer" }, new Date("2026-07-03T10:00:00.000Z"));

  await store.create(older);
  await store.create(newer);

  assert.deepEqual(
    (await store.list()).map((share) => share.name),
    ["Newer", "Older"]
  );
});
