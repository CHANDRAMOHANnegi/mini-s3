import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { cleanupExpiredResources } from "./resourceCleanup.js";
import { createResource } from "../domain/resources.js";
import { createLocalObjectStorage } from "../storage/localStorage.js";
import { createMemoryResourceStore } from "../stores/resourceStore.js";

test("cleanupExpiredResources deletes bytes and marks expired resources deleted", async () => {
  const resourceStore = createMemoryResourceStore();
  const objectStorage = createLocalObjectStorage({
    rootDir: await mkdtemp(path.join(tmpdir(), "mini-s3-cleanup-"))
  });
  const now = new Date("2026-07-03T12:00:00.000Z");
  const expiredBytes = Buffer.from("old bytes");
  const activeBytes = Buffer.from("fresh bytes");
  const expiredResource = createResource({
    shareId: "share_old",
    originalName: "old.txt",
    mimeType: "text/plain",
    size: expiredBytes.length,
    bytes: expiredBytes,
    expiresAt: "2026-07-01T12:00:00.000Z"
  });
  const activeResource = createResource({
    shareId: "share_active",
    originalName: "active.txt",
    mimeType: "text/plain",
    size: activeBytes.length,
    bytes: activeBytes,
    expiresAt: "2026-07-05T12:00:00.000Z"
  });
  await resourceStore.create(expiredResource);
  await resourceStore.create(activeResource);
  await objectStorage.put(expiredResource.storageKey, expiredBytes);
  await objectStorage.put(activeResource.storageKey, activeBytes);

  const result = await cleanupExpiredResources({ resourceStore, objectStorage }, now);

  assert.deepEqual(result, {
    scanned: 2,
    expiredMarkedDeleted: 1,
    bytesDeleted: 1
  });
  assert.equal(await objectStorage.exists(expiredResource.storageKey), false);
  assert.equal(await objectStorage.exists(activeResource.storageKey), true);

  const deletedResource = await resourceStore.findById(expiredResource.id);
  assert.equal(deletedResource?.deletedAt, now.toISOString());
});

test("cleanupExpiredResources deletes stale bytes for already deleted expired resources", async () => {
  const resourceStore = createMemoryResourceStore();
  const objectStorage = createLocalObjectStorage({
    rootDir: await mkdtemp(path.join(tmpdir(), "mini-s3-cleanup-deleted-"))
  });
  const now = new Date("2026-07-03T12:00:00.000Z");
  const bytes = Buffer.from("stale bytes");
  const resource = createResource({
    shareId: "share_deleted",
    originalName: "deleted.txt",
    mimeType: "text/plain",
    size: bytes.length,
    bytes,
    expiresAt: "2026-07-01T12:00:00.000Z"
  });
  await resourceStore.create(resource);
  await resourceStore.markDeleted(resource.id, new Date("2026-07-02T12:00:00.000Z"));
  await objectStorage.put(resource.storageKey, bytes);

  const result = await cleanupExpiredResources({ resourceStore, objectStorage }, now);

  assert.deepEqual(result, {
    scanned: 1,
    expiredMarkedDeleted: 0,
    bytesDeleted: 1
  });
  assert.equal(await objectStorage.exists(resource.storageKey), false);
});
