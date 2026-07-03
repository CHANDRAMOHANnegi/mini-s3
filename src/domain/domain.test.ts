import assert from "node:assert/strict";
import { test } from "node:test";
import { isExpired, isInactive } from "./expiry.js";
import { canAccess, permissionsForMode } from "./permissions.js";
import { createResource, previewTypeForMime } from "./resources.js";
import { createShare } from "./shares.js";

test("readonly links can list, preview, and download but cannot upload or delete", () => {
  const permissions = permissionsForMode("readonly");

  assert.equal(permissions.list, true);
  assert.equal(permissions.preview, true);
  assert.equal(permissions.download, true);
  assert.equal(permissions.upload, false);
  assert.equal(permissions.delete, false);
});

test("upload links can upload but cannot delete", () => {
  assert.equal(canAccess("upload", "upload"), true);
  assert.equal(canAccess("upload", "delete"), false);
});

test("edit links can delete resources", () => {
  assert.equal(canAccess("edit", "delete"), true);
});

test("expiry helper marks entities inactive after expiresAt", () => {
  const now = new Date("2026-07-03T10:00:00.000Z");
  const entity = {
    expiresAt: "2026-07-03T09:59:59.000Z",
    revokedAt: null,
    deletedAt: null
  };

  assert.equal(isExpired(entity, now), true);
  assert.equal(isInactive(entity, now), true);
});

test("createShare returns a safe default upload link", () => {
  const now = new Date("2026-07-03T10:00:00.000Z");
  const share = createShare({ name: "Client upload" }, now);

  assert.match(share.id, /^share_/);
  assert.equal(share.name, "Client upload");
  assert.equal(share.accessMode, "upload");
  assert.equal(share.permissions.upload, true);
  assert.equal(share.permissions.delete, false);
  assert.equal(share.createdAt, "2026-07-03T10:00:00.000Z");
  assert.equal(share.expiresAt, "2026-07-04T10:00:00.000Z");
});

test("previewTypeForMime maps common browser preview types", () => {
  assert.equal(previewTypeForMime("image/png"), "image");
  assert.equal(previewTypeForMime("video/mp4"), "video");
  assert.equal(previewTypeForMime("audio/mpeg"), "audio");
  assert.equal(previewTypeForMime("application/pdf"), "pdf");
  assert.equal(previewTypeForMime("text/plain"), "text");
  assert.equal(previewTypeForMime("text/html"), "html");
  assert.equal(previewTypeForMime("application/octet-stream"), "binary");
});

test("createResource connects a resource to a share", () => {
  const now = new Date("2026-07-03T10:00:00.000Z");
  const resource = createResource(
    {
      shareId: "share_123",
      originalName: "demo.mp4",
      mimeType: "video/mp4",
      size: 1024,
      bytes: Buffer.from("video bytes"),
      expiresAt: "2026-07-04T10:00:00.000Z"
    },
    now
  );

  assert.match(resource.id, /^res_/);
  assert.equal(resource.shareId, "share_123");
  assert.equal(resource.originalName, "demo.mp4");
  assert.equal(resource.previewType, "video");
  assert.equal(resource.storageKey, `shares/share_123/resources/${resource.id}`);
  assert.equal(resource.checksum.length, 64);
});
