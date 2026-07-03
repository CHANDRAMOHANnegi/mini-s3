import assert from "node:assert/strict";
import { test } from "node:test";
import request from "supertest";
import { createApp } from "./app.js";
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
