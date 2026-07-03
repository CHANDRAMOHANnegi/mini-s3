import path from "node:path";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import multer from "multer";
import { isInactive } from "./domain/expiry.js";
import { canAccess } from "./domain/permissions.js";
import { createResource, type Resource } from "./domain/resources.js";
import { createShare, type Share } from "./domain/shares.js";
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

function canPreview(resource: Resource): boolean {
  return resource.previewType !== "binary";
}

function quotedFilename(name: string): string {
  return name.replaceAll("\\", "_").replaceAll('"', "'").replace(/[\r\n]/g, "_");
}

function inactiveShareCode(share: Share): "SHARE_REVOKED" | "SHARE_EXPIRED" {
  return share.revokedAt ? "SHARE_REVOKED" : "SHARE_EXPIRED";
}

function sendInactiveShare(res: express.Response, share: Share): boolean {
  if (!isInactive(share)) return false;

  res.status(410).json({
    error: {
      code: inactiveShareCode(share),
      message: "Share link is no longer active."
    }
  });
  return true;
}

function sendExpiredResource(res: express.Response, resource: Resource): boolean {
  if (!isInactive(resource)) return false;

  res.status(410).json({
    error: {
      code: "RESOURCE_EXPIRED",
      message: "Resource is no longer active."
    }
  });
  return true;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const shareStore = dependencies.shareStore || createMemoryShareStore();
  const resourceStore = dependencies.resourceStore || createMemoryResourceStore();
  const objectStorage =
    dependencies.objectStorage || createLocalObjectStorage({ rootDir: path.join(process.cwd(), "storage", "objects") });
  const publicDir = path.join(process.cwd(), "public");

  app.use(express.static(publicDir));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/debug/sample-share", (_req, res) => {
    res.json({ share: createShare() });
  });

  app.get("/s/:shareId", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
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

    if (sendInactiveShare(res, share)) return;

    const resources = (await resourceStore.listByShareId(share.id)).filter((resource) => !isInactive(resource));

    res.json({ share, resources });
  });

  app.get("/api/shares/:shareId/resources/:resourceId/download", async (req, res, next) => {
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

    if (sendInactiveShare(res, share)) return;

    if (!canAccess(share.accessMode, "download")) {
      res.status(403).json({
        error: {
          code: "PERMISSION_DENIED",
          message: "This share link does not allow downloads."
        }
      });
      return;
    }

    const resource = await resourceStore.findById(routeParam(req.params.resourceId));

    if (!resource || resource.shareId !== share.id || resource.deletedAt) {
      res.status(404).json({
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Resource not found in this share."
        }
      });
      return;
    }

    if (sendExpiredResource(res, resource)) return;

    if (!(await objectStorage.exists(resource.storageKey))) {
      res.status(404).json({
        error: {
          code: "RESOURCE_BYTES_NOT_FOUND",
          message: "Resource bytes are missing from storage."
        }
      });
      return;
    }

    const stream = objectStorage.getStream(resource.storageKey);
    stream.on("error", next);

    res.type(resource.mimeType);
    res.setHeader("Content-Length", String(resource.size));
    res.attachment(resource.originalName);
    stream.pipe(res);
  });

  app.get("/api/shares/:shareId/resources/:resourceId/preview", async (req, res, next) => {
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

    if (sendInactiveShare(res, share)) return;

    if (!canAccess(share.accessMode, "preview")) {
      res.status(403).json({
        error: {
          code: "PERMISSION_DENIED",
          message: "This share link does not allow previews."
        }
      });
      return;
    }

    const resource = await resourceStore.findById(routeParam(req.params.resourceId));

    if (!resource || resource.shareId !== share.id || resource.deletedAt) {
      res.status(404).json({
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Resource not found in this share."
        }
      });
      return;
    }

    if (sendExpiredResource(res, resource)) return;

    if (!canPreview(resource)) {
      res.status(415).json({
        error: {
          code: "PREVIEW_UNSUPPORTED",
          message: "This resource type cannot be previewed."
        }
      });
      return;
    }

    if (!(await objectStorage.exists(resource.storageKey))) {
      res.status(404).json({
        error: {
          code: "RESOURCE_BYTES_NOT_FOUND",
          message: "Resource bytes are missing from storage."
        }
      });
      return;
    }

    const stream = objectStorage.getStream(resource.storageKey);
    stream.on("error", next);

    res.type(resource.mimeType);
    res.setHeader("Content-Length", String(resource.size));
    res.setHeader("Content-Disposition", `inline; filename="${quotedFilename(resource.originalName)}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (resource.previewType === "html") {
      res.setHeader("Content-Security-Policy", "sandbox");
    }
    stream.pipe(res);
  });

  app.delete("/api/shares/:shareId/resources/:resourceId", async (req, res) => {
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

    if (sendInactiveShare(res, share)) return;

    if (!canAccess(share.accessMode, "delete")) {
      res.status(403).json({
        error: {
          code: "PERMISSION_DENIED",
          message: "This share link does not allow deletes."
        }
      });
      return;
    }

    const resource = await resourceStore.findById(routeParam(req.params.resourceId));

    if (!resource || resource.shareId !== share.id || resource.deletedAt) {
      res.status(404).json({
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Resource not found in this share."
        }
      });
      return;
    }

    if (sendExpiredResource(res, resource)) return;

    await objectStorage.delete(resource.storageKey);
    const deletedResource = await resourceStore.markDeleted(resource.id);

    res.json({ resource: deletedResource });
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

    if (sendInactiveShare(res, share)) return;

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
