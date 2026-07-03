import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createShare } from "./domain/shares.js";
import { createMemoryShareStore, type ShareStore } from "./stores/shareStore.js";

const port = Number(process.env.PORT || 8787);
const jsonType = { "content-type": "application/json; charset=utf-8" };
const shareStore = createMemoryShareStore();

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, jsonType);
  res.end(JSON.stringify(body, null, 2));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) return {};

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function routeParts(req: IncomingMessage): string[] {
  const url = new URL(req.url || "/", "http://localhost");
  return url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, store: ShareStore): Promise<void> {
  const parts = routeParts(req);

  if (req.method === "GET" && parts.join("/") === "health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && parts.join("/") === "debug/sample-share") {
    sendJson(res, 200, { share: createShare() });
    return;
  }

  if (req.method === "POST" && parts.join("/") === "api/shares") {
    const body = await readJsonBody(req);
    const share = await store.create(createShare(typeof body === "object" && body !== null ? body : {}));

    sendJson(res, 201, {
      share,
      shareUrl: `/s/${share.id}`
    });
    return;
  }

  if (req.method === "GET" && parts[0] === "api" && parts[1] === "shares" && parts[2]) {
    const share = await store.findById(parts[2]);

    if (!share) {
      sendJson(res, 404, { error: { code: "SHARE_NOT_FOUND", message: "Share link not found." } });
      return;
    }

    sendJson(res, 200, { share });
    return;
  }

  sendJson(res, 404, { error: { code: "NOT_FOUND", message: "Route not found" } });
}

export function createAppServer(store: ShareStore = shareStore): http.Server {
  return http.createServer((req, res) => {
    handleRequest(req, res, store).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Server error";
      sendJson(res, 500, { error: { code: "SERVER_ERROR", message } });
    });
  });
}

const server = createAppServer();

server.listen(port, () => {
  console.log(`mini-s3 TypeScript server listening on http://localhost:${port}`);
});
