import path from "node:path";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import multer from "multer";
import { canAccess } from "./domain/permissions.js";
import { createResource } from "./domain/resources.js";
import { createShare } from "./domain/shares.js";
import { createLocalObjectStorage } from "./storage/localStorage.js";
import type { ObjectStorage } from "./storage/storage.js";
import { createMemoryResourceStore, type ResourceStore } from "./stores/resourceStore.js";
import { createMemoryShareStore, type ShareStore } from "./stores/shareStore.js";

export type AppDependencies = {
  shareStore?: ShareStore;
  resourceStore?: ResourceStore;
  objectStorage?: ObjectStorage;
};

const uploadParser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found"
    }
  });
};

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Server error";

  res.status(500).json({
    error: {
      code: "SERVER_ERROR",
      message
    }
  });
};

function objectBody(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

function stringField(body: Record<string, unknown>, key: string, fallback: string): string {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberField(body: Record<string, unknown>, key: string, fallback: number): number {
  const value = Number(body[key]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const shareStore = dependencies.shareStore || createMemoryShareStore();
  const resourceStore = dependencies.resourceStore || createMemoryResourceStore();
  const objectStorage =
    dependencies.objectStorage || createLocalObjectStorage({ rootDir: path.join(process.cwd(), "storage", "objects") });

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/debug/sample-share", (_req, res) => {
    res.json({ share: createShare() });
  });

  app.post("/api/shares", async (req, res) => {
    const share = await shareStore.create(createShare(objectBody(req.body)));

    res.status(201).json({
      share,
      shareUrl: `/s/${share.id}`
    });
  });

  app.get("/api/shares/:shareId", async (req, res) => {
    const share = await shareStore.findById(routeParam(req.params.shareId));

    if (!share) {
      res.status(404).json({
        error: {
          code: "SHARE_NOT_FOUND",
          message: "Share link not found."
        }
      });
      return;
    }

    res.json({ share });
  });

  app.get("/api/shares/:shareId/resources", async (req, res) => {
    const share = await shareStore.findById(routeParam(req.params.shareId));

    if (!share) {
      res.status(404).json({
        error: {
          code: "SHARE_NOT_FOUND",
          message: "Share link not found."
        }
      });
      return;
    }

    const resources = await resourceStore.listByShareId(share.id);

    res.json({ share, resources });
  });

  app.post("/api/shares/:shareId/resources", uploadParser.single("file"), async (req, res) => {
    const share = await shareStore.findById(routeParam(req.params.shareId));

    if (!share) {
      res.status(404).json({
        error: {
          code: "SHARE_NOT_FOUND",
          message: "Share link not found."
        }
      });
      return;
    }

    if (!canAccess(share.accessMode, "upload")) {
      res.status(403).json({
        error: {
          code: "PERMISSION_DENIED",
          message: "This share link does not allow uploads."
        }
      });
      return;
    }

    const body = objectBody(req.body);
    const uploadedFile = req.file;
    const size = uploadedFile ? uploadedFile.size : numberField(body, "size", 0);

    if (size > share.maxResourceBytes) {
      res.status(413).json({
        error: {
          code: "RESOURCE_TOO_LARGE",
          message: `Resource is larger than ${share.maxResourceBytes} bytes.`
        }
      });
      return;
    }

    const metadata = typeof body.metadata === "string" ? { note: body.metadata } : objectBody(body.metadata);
    const resource = createResource({
      shareId: share.id,
      originalName: uploadedFile?.originalname || stringField(body, "originalName", "untitled-resource"),
      mimeType: uploadedFile?.mimetype || stringField(body, "mimeType", "application/octet-stream"),
      size,
      bytes: uploadedFile?.buffer,
      expiresAt: share.expiresAt,
      metadata
    });

    if (uploadedFile) {
      // Bytes are saved first so metadata never points to a missing object.
      await objectStorage.put(resource.storageKey, uploadedFile.buffer);
    }

    const savedResource = await resourceStore.create(resource);

    res.status(201).json({ resource: savedResource });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
