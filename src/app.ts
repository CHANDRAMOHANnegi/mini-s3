import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { createShare } from "./domain/shares.js";
import { createMemoryResourceStore, type ResourceStore } from "./stores/resourceStore.js";
import { createMemoryShareStore, type ShareStore } from "./stores/shareStore.js";

export type AppDependencies = {
  shareStore?: ShareStore;
  resourceStore?: ResourceStore;
};

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

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const shareStore = dependencies.shareStore || createMemoryShareStore();
  const resourceStore = dependencies.resourceStore || createMemoryResourceStore();

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
    const share = await shareStore.findById(req.params.shareId);

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
    const share = await shareStore.findById(req.params.shareId);

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
