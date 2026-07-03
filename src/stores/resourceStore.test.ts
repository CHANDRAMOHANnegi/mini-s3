import assert from "node:assert/strict";
import { test } from "node:test";
import { createResource } from "../domain/resources.js";
import { createMemoryResourceStore } from "./resourceStore.js";

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
