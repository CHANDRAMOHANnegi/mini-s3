import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createResource } from "../domain/resources.js";
import { createLocalObjectStorage } from "../storage/localStorage.js";
import { createMemoryResourceStore } from "../stores/resourceStore.js";
import { startResourceCleanupScheduler, type CleanupLogger } from "./resourceCleanupScheduler.js";

const silentLogger: CleanupLogger = {
  info() {},
  error() {}
};

test("resource cleanup scheduler runOnce cleans expired resources", async () => {
  const resourceStore = createMemoryResourceStore();
  const objectStorage = createLocalObjectStorage({
    rootDir: await mkdtemp(path.join(tmpdir(), "mini-s3-scheduler-"))
  });
  const bytes = Buffer.from("expired");
  const resource = createResource({
    shareId: "share_scheduler",
    originalName: "expired.txt",
    mimeType: "text/plain",
    size: bytes.length,
    bytes,
    expiresAt: "2026-07-01T12:00:00.000Z"
  });
  await resourceStore.create(resource);
  await objectStorage.put(resource.storageKey, bytes);

  const scheduler = startResourceCleanupScheduler({
    resourceStore,
    objectStorage,
    intervalMs: 60_000,
    logger: silentLogger,
    now: () => new Date("2026-07-03T12:00:00.000Z")
  });

  const result = await scheduler.runOnce();
  scheduler.stop();

  assert.equal(result?.expiredMarkedDeleted, 1);
  assert.equal(result?.bytesDeleted, 1);
  assert.equal(await objectStorage.exists(resource.storageKey), false);
  assert.ok((await resourceStore.findById(resource.id))?.deletedAt);
});

test("resource cleanup scheduler stop clears the registered interval", () => {
  const resourceStore = createMemoryResourceStore();
  const objectStorage = createLocalObjectStorage({ rootDir: "/tmp/mini-s3-unused" });
  const timer = { unrefCalled: false, unref() { this.unrefCalled = true; } };
  let registeredIntervalMs = 0;
  let clearedTimer: unknown = null;
  const scheduler = startResourceCleanupScheduler({
    resourceStore,
    objectStorage,
    intervalMs: 1234,
    logger: silentLogger,
    setIntervalFn(callback: () => void, intervalMs: number) {
      void callback;
      registeredIntervalMs = intervalMs;
      return timer;
    },
    clearIntervalFn(handle) {
      clearedTimer = handle;
    }
  });

  scheduler.stop();

  assert.equal(registeredIntervalMs, 1234);
  assert.equal(timer.unrefCalled, true);
  assert.equal(clearedTimer, timer);
});
