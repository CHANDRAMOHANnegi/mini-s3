import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createShare } from "../domain/shares.js";
import { createJsonFileShareStore, createMemoryShareStore } from "./shareStore.js";

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

test("json file share store persists shares across store instances", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "mini-s3-share-store-"));
  const filePath = path.join(rootDir, "shares.json");
  const firstStore = createJsonFileShareStore(filePath);
  const share = createShare({ name: "Persistent share" }, new Date("2026-07-03T10:00:00.000Z"));

  await firstStore.create(share);

  const secondStore = createJsonFileShareStore(filePath);
  assert.deepEqual(await secondStore.findById(share.id), share);
  assert.deepEqual(
    (await secondStore.list()).map((savedShare) => savedShare.name),
    ["Persistent share"]
  );
});
