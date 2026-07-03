import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createLocalObjectStorage } from "./localStorage.js";

async function withTempStorage<T>(fn: (rootDir: string) => Promise<T>): Promise<T> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "mini-s3-storage-"));

  try {
    return await fn(rootDir);
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
}

test("local object storage writes and reads bytes by storage key", async () => {
  await withTempStorage(async (rootDir) => {
    const storage = createLocalObjectStorage({ rootDir });
    const key = "shares/share_123/resources/res_456";
    const bytes = Buffer.from("hello storage");

    const info = await storage.put(key, bytes);

    assert.deepEqual(info, { key, size: bytes.length });
    assert.equal(await storage.exists(key), true);
    assert.deepEqual(await storage.get(key), bytes);
  });
});

test("local object storage deletes bytes by storage key", async () => {
  await withTempStorage(async (rootDir) => {
    const storage = createLocalObjectStorage({ rootDir });
    const key = "shares/share_123/resources/res_456";

    await storage.put(key, Buffer.from("delete me"));
    await storage.delete(key);

    assert.equal(await storage.exists(key), false);
  });
});

test("local object storage rejects path traversal keys", async () => {
  await withTempStorage(async (rootDir) => {
    const storage = createLocalObjectStorage({ rootDir });

    await assert.rejects(() => storage.put("../outside", Buffer.from("bad")), /Invalid storage key/);
  });
});
