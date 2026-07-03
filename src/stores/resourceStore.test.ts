import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createResource } from "../domain/resources.js";
import { createJsonFileResourceStore, createMemoryResourceStore } from "./resourceStore.js";

test("memory resource store saves and finds resources by id", async () => {
  const store = createMemoryResourceStore();
  const resource = createResource({
    shareId: "share_123",
    originalName: "demo.txt",
    mimeType: "text/plain",
    size: 12,
    expiresAt: "2026-07-04T10:00:00.000Z"
  });

  await store.create(resource);

  assert.deepEqual(await store.findById(resource.id), resource);
  assert.equal(await store.findById("missing"), null);
});

test("memory resource store lists resources for one share only", async () => {
  const store = createMemoryResourceStore();
  const first = createResource(
    {
      shareId: "share_123",
      originalName: "first.txt",
      mimeType: "text/plain",
      size: 1,
      expiresAt: "2026-07-04T10:00:00.000Z"
    },
    new Date("2026-07-03T09:00:00.000Z")
  );
  const second = createResource(
    {
      shareId: "share_123",
      originalName: "second.txt",
      mimeType: "text/plain",
      size: 1,
      expiresAt: "2026-07-04T10:00:00.000Z"
    },
    new Date("2026-07-03T10:00:00.000Z")
  );
  const otherShare = createResource({
    shareId: "share_other",
    originalName: "other.txt",
    mimeType: "text/plain",
    size: 1,
    expiresAt: "2026-07-04T10:00:00.000Z"
  });

  await store.create(first);
  await store.create(second);
  await store.create(otherShare);

  assert.deepEqual(
    (await store.listByShareId("share_123")).map((resource) => resource.originalName),
    ["second.txt", "first.txt"]
  );
});

test("memory resource store listAll includes deleted resources for cleanup jobs", async () => {
  const store = createMemoryResourceStore();
  const resource = createResource({
    shareId: "share_123",
    originalName: "deleted.txt",
    mimeType: "text/plain",
    size: 1,
    expiresAt: "2026-07-04T10:00:00.000Z"
  });

  await store.create(resource);
  await store.markDeleted(resource.id, new Date("2026-07-03T10:00:00.000Z"));

  assert.equal((await store.listByShareId("share_123")).length, 0);
  assert.equal((await store.listAll()).length, 1);
  assert.equal((await store.listAll())[0].deletedAt, "2026-07-03T10:00:00.000Z");
});

test("json file resource store persists resources and deletion state across store instances", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "mini-s3-resource-store-"));
  const filePath = path.join(rootDir, "resources.json");
  const firstStore = createJsonFileResourceStore(filePath);
  const resource = createResource({
    shareId: "share_123",
    originalName: "persistent.txt",
    mimeType: "text/plain",
    size: 1,
    expiresAt: "2026-07-04T10:00:00.000Z"
  });

  await firstStore.create(resource);
  await firstStore.markDeleted(resource.id, new Date("2026-07-03T10:00:00.000Z"));

  const secondStore = createJsonFileResourceStore(filePath);
  const savedResource = await secondStore.findById(resource.id);

  assert.equal(savedResource?.originalName, "persistent.txt");
  assert.equal(savedResource?.deletedAt, "2026-07-03T10:00:00.000Z");
  assert.equal((await secondStore.listByShareId("share_123")).length, 0);
  assert.equal((await secondStore.listAll()).length, 1);
});
