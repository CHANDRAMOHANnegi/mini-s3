import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "./app.js";
import { createResource } from "./domain/resources.js";
import { createLocalObjectStorage } from "./storage/localStorage.js";
import { createMemoryResourceStore } from "./stores/resourceStore.js";
import { createMemoryShareStore } from "./stores/shareStore.js";

test("GET /health returns service health", async () => {
  const app = createApp();

  const response = await request(app).get("/health").expect(200);

  assert.deepEqual(response.body, { ok: true });
});

test("POST /api/shares creates an upload share", async () => {
  const app = createApp({ shareStore: createMemoryShareStore() });

  const response = await request(app)
    .post("/api/shares")
    .send({
      name: "Client upload",
      accessMode: "upload",
      expiresInHours: 24,
      maxResourceBytes: 1024
    })
    .expect(201);

  assert.match(response.body.share.id, /^share_/);
  assert.equal(response.body.share.name, "Client upload");
  assert.equal(response.body.share.accessMode, "upload");
  assert.equal(response.body.share.permissions.upload, true);
  assert.equal(response.body.share.permissions.delete, false);
  assert.equal(response.body.share.maxResourceBytes, 1024);
  assert.equal(response.body.shareUrl, `/s/${response.body.share.id}`);
});

test("GET /api/shares/:shareId returns a created share", async () => {
  const app = createApp({ shareStore: createMemoryShareStore() });

  const createResponse = await request(app)
    .post("/api/shares")
    .send({ name: "Review room", accessMode: "readonly" })
    .expect(201);

  const shareId = createResponse.body.share.id;
  const getResponse = await request(app).get(`/api/shares/${shareId}`).expect(200);

  assert.equal(getResponse.body.share.id, shareId);
  assert.equal(getResponse.body.share.name, "Review room");
  assert.equal(getResponse.body.share.accessMode, "readonly");
  assert.equal(getResponse.body.share.permissions.upload, false);
});

test("GET /api/shares/:shareId/resources lists resources inside a share", async () => {
  const shareStore = createMemoryShareStore();
  const resourceStore = createMemoryResourceStore();
  const app = createApp({ shareStore, resourceStore });

  const createResponse = await request(app)
    .post("/api/shares")
    .send({ name: "Asset room", accessMode: "upload" })
    .expect(201);

  const share = createResponse.body.share;
  const resource = createResource({
    shareId: share.id,
    originalName: "notes.txt",
    mimeType: "text/plain",
    size: 42,
    expiresAt: share.expiresAt
  });
  await resourceStore.create(resource);

  const response = await request(app).get(`/api/shares/${share.id}/resources`).expect(200);

  assert.equal(response.body.share.id, share.id);
  assert.equal(response.body.resources.length, 1);
  assert.equal(response.body.resources[0].id, resource.id);
  assert.equal(response.body.resources[0].originalName, "notes.txt");
});

test("GET /api/shares/:shareId/resources returns 404 for missing share", async () => {
  const app = createApp({ shareStore: createMemoryShareStore(), resourceStore: createMemoryResourceStore() });

  const response = await request(app).get("/api/shares/share_missing/resources").expect(404);

  assert.equal(response.body.error.code, "SHARE_NOT_FOUND");
});

test("POST /api/shares/:shareId/resources creates resource metadata", async () => {
  const shareStore = createMemoryShareStore();
  const resourceStore = createMemoryResourceStore();
  const app = createApp({ shareStore, resourceStore });

  const createShareResponse = await request(app)
    .post("/api/shares")
    .send({ name: "Upload room", accessMode: "upload", maxResourceBytes: 1024 })
    .expect(201);

  const share = createShareResponse.body.share;
  const createResourceResponse = await request(app)
    .post(`/api/shares/${share.id}/resources`)
    .send({
      originalName: "hello.txt",
      mimeType: "text/plain",
      size: 12,
      metadata: { note: "metadata only for now" }
    })
    .expect(201);

  assert.match(createResourceResponse.body.resource.id, /^res_/);
  assert.equal(createResourceResponse.body.resource.shareId, share.id);
  assert.equal(createResourceResponse.body.resource.originalName, "hello.txt");
  assert.equal(createResourceResponse.body.resource.mimeType, "text/plain");
  assert.equal(createResourceResponse.body.resource.previewType, "text");
  assert.equal(createResourceResponse.body.resource.expiresAt, share.expiresAt);

  const listResponse = await request(app).get(`/api/shares/${share.id}/resources`).expect(200);
  assert.equal(listResponse.body.resources.length, 1);
  assert.equal(listResponse.body.resources[0].id, createResourceResponse.body.resource.id);
});

test("POST /api/shares/:shareId/resources uploads file bytes", async () => {
  const shareStore = createMemoryShareStore();
  const resourceStore = createMemoryResourceStore();
  const storageRoot = await mkdtemp(path.join(tmpdir(), "mini-s3-upload-"));
  const objectStorage = createLocalObjectStorage({ rootDir: storageRoot });
  const app = createApp({ shareStore, resourceStore, objectStorage });

  const createShareResponse = await request(app)
    .post("/api/shares")
    .send({ name: "Real upload room", accessMode: "upload", maxResourceBytes: 1024 })
    .expect(201);

  const fileBytes = Buffer.from("hello from multipart upload");
  const uploadResponse = await request(app)
    .post(`/api/shares/${createShareResponse.body.share.id}/resources`)
    .attach("file", fileBytes, {
      filename: "hello.txt",
      contentType: "text/plain"
    })
    .field("metadata", "first real file")
    .expect(201);

  const resource = uploadResponse.body.resource;
  assert.match(resource.id, /^res_/);
  assert.equal(resource.originalName, "hello.txt");
  assert.equal(resource.mimeType, "text/plain");
  assert.equal(resource.size, fileBytes.length);
  assert.equal(resource.previewType, "text");
  assert.equal(resource.metadata.note, "first real file");

  const storedBytes = await objectStorage.get(resource.storageKey);
  assert.equal(storedBytes.toString("utf8"), fileBytes.toString("utf8"));
});

test("GET /api/shares/:shareId/resources/:resourceId/download streams uploaded bytes", async () => {
  const shareStore = createMemoryShareStore();
  const resourceStore = createMemoryResourceStore();
  const storageRoot = await mkdtemp(path.join(tmpdir(), "mini-s3-download-"));
  const objectStorage = createLocalObjectStorage({ rootDir: storageRoot });
  const app = createApp({ shareStore, resourceStore, objectStorage });

  const createShareResponse = await request(app)
    .post("/api/shares")
    .send({ name: "Download room", accessMode: "readonly", maxResourceBytes: 1024 })
    .expect(201);

  const share = createShareResponse.body.share;
  const bytes = Buffer.from("download me please");
  const resource = createResource({
    shareId: share.id,
    originalName: "download.txt",
    mimeType: "text/plain",
    size: bytes.length,
    bytes,
    expiresAt: share.expiresAt
  });
  await objectStorage.put(resource.storageKey, bytes);
  await resourceStore.create(resource);

  const response = await request(app)
    .get(`/api/shares/${share.id}/resources/${resource.id}/download`)
    .expect(200);

  assert.equal(response.text, "download me please");
  assert.match(response.headers["content-type"], /^text\/plain/);
  assert.match(response.headers["content-disposition"], /attachment; filename="download.txt"/);
});

test("GET /api/shares/:shareId/resources/:resourceId/download rejects resources from another share", async () => {
  const shareStore = createMemoryShareStore();
  const resourceStore = createMemoryResourceStore();
  const storageRoot = await mkdtemp(path.join(tmpdir(), "mini-s3-wrong-share-"));
  const objectStorage = createLocalObjectStorage({ rootDir: storageRoot });
  const app = createApp({ shareStore, resourceStore, objectStorage });

  const firstShareResponse = await request(app).post("/api/shares").send({ name: "First" }).expect(201);
  const secondShareResponse = await request(app).post("/api/shares").send({ name: "Second" }).expect(201);
  const secondShare = secondShareResponse.body.share;
  const resource = createResource({
    shareId: secondShare.id,
    originalName: "secret.txt",
    mimeType: "text/plain",
    size: 6,
    bytes: Buffer.from("secret"),
    expiresAt: secondShare.expiresAt
  });
  await objectStorage.put(resource.storageKey, Buffer.from("secret"));
  await resourceStore.create(resource);

  const response = await request(app)
    .get(`/api/shares/${firstShareResponse.body.share.id}/resources/${resource.id}/download`)
    .expect(404);

  assert.equal(response.body.error.code, "RESOURCE_NOT_FOUND");
});

test("GET /api/shares/:shareId/resources/:resourceId/preview streams previewable bytes inline", async () => {
  const shareStore = createMemoryShareStore();
  const resourceStore = createMemoryResourceStore();
  const storageRoot = await mkdtemp(path.join(tmpdir(), "mini-s3-preview-"));
  const objectStorage = createLocalObjectStorage({ rootDir: storageRoot });
  const app = createApp({ shareStore, resourceStore, objectStorage });

  const createShareResponse = await request(app)
    .post("/api/shares")
    .send({ name: "Preview room", accessMode: "readonly", maxResourceBytes: 1024 })
    .expect(201);

  const share = createShareResponse.body.share;
  const bytes = Buffer.from("preview me inline");
  const resource = createResource({
    shareId: share.id,
    originalName: "preview.txt",
    mimeType: "text/plain",
    size: bytes.length,
    bytes,
    expiresAt: share.expiresAt
  });
  await objectStorage.put(resource.storageKey, bytes);
  await resourceStore.create(resource);

  const response = await request(app)
    .get(`/api/shares/${share.id}/resources/${resource.id}/preview`)
    .expect(200);

  assert.equal(response.text, "preview me inline");
  assert.match(response.headers["content-type"], /^text\/plain/);
  assert.match(response.headers["content-disposition"], /inline; filename="preview.txt"/);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
});

test("GET /api/shares/:shareId/resources/:resourceId/preview rejects binary resources", async () => {
  const shareStore = createMemoryShareStore();
  const resourceStore = createMemoryResourceStore();
  const storageRoot = await mkdtemp(path.join(tmpdir(), "mini-s3-binary-preview-"));
  const objectStorage = createLocalObjectStorage({ rootDir: storageRoot });
  const app = createApp({ shareStore, resourceStore, objectStorage });

  const createShareResponse = await request(app)
    .post("/api/shares")
    .send({ name: "Binary room", accessMode: "readonly", maxResourceBytes: 1024 })
    .expect(201);

  const share = createShareResponse.body.share;
  const bytes = Buffer.from([0, 1, 2, 3]);
  const resource = createResource({
    shareId: share.id,
    originalName: "archive.bin",
    mimeType: "application/octet-stream",
    size: bytes.length,
    bytes,
    expiresAt: share.expiresAt
  });
  await objectStorage.put(resource.storageKey, bytes);
  await resourceStore.create(resource);

  const response = await request(app)
    .get(`/api/shares/${share.id}/resources/${resource.id}/preview`)
    .expect(415);

  assert.equal(response.body.error.code, "PREVIEW_UNSUPPORTED");
});

test("POST /api/shares/:shareId/resources rejects readonly links", async () => {
  const app = createApp({ shareStore: createMemoryShareStore(), resourceStore: createMemoryResourceStore() });

  const createShareResponse = await request(app)
    .post("/api/shares")
    .send({ name: "Readonly room", accessMode: "readonly" })
    .expect(201);

  const response = await request(app)
    .post(`/api/shares/${createShareResponse.body.share.id}/resources`)
    .send({ originalName: "blocked.txt", mimeType: "text/plain", size: 1 })
    .expect(403);

  assert.equal(response.body.error.code, "PERMISSION_DENIED");
});

test("POST /api/shares/:shareId/resources rejects oversized resources", async () => {
  const app = createApp({ shareStore: createMemoryShareStore(), resourceStore: createMemoryResourceStore() });

  const createShareResponse = await request(app)
    .post("/api/shares")
    .send({ name: "Small room", accessMode: "upload", maxResourceBytes: 10 })
    .expect(201);

  const response = await request(app)
    .post(`/api/shares/${createShareResponse.body.share.id}/resources`)
    .send({ originalName: "large.txt", mimeType: "text/plain", size: 11 })
    .expect(413);

  assert.equal(response.body.error.code, "RESOURCE_TOO_LARGE");
});

test("GET /api/shares/:shareId returns 404 for missing share", async () => {
  const app = createApp({ shareStore: createMemoryShareStore() });

  const response = await request(app).get("/api/shares/share_missing").expect(404);

  assert.equal(response.body.error.code, "SHARE_NOT_FOUND");
});

test("unknown routes return consistent error shape", async () => {
  const app = createApp();

  const response = await request(app).get("/missing").expect(404);

  assert.equal(response.body.error.code, "NOT_FOUND");
});
