import path from "node:path";
import { createApp } from "./app.js";
import { startResourceCleanupScheduler } from "./cleanup/resourceCleanupScheduler.js";
import { createLocalObjectStorage } from "./storage/localStorage.js";
import { createMemoryResourceStore } from "./stores/resourceStore.js";
import { createMemoryShareStore } from "./stores/shareStore.js";

const port = Number(process.env.PORT || 8787);
const cleanupIntervalMs = Number(process.env.CLEANUP_INTERVAL_MS || 5 * 60 * 1000);
const shareStore = createMemoryShareStore();
const resourceStore = createMemoryResourceStore();
const objectStorage = createLocalObjectStorage({
  rootDir: path.join(process.cwd(), "storage", "objects")
});
const app = createApp({ shareStore, resourceStore, objectStorage });
const cleanupScheduler = startResourceCleanupScheduler({
  resourceStore,
  objectStorage,
  intervalMs: cleanupIntervalMs,
  logger: console,
  runImmediately: true
});

const server = app.listen(port, () => {
  console.log(`mini-s3 Express server listening on http://localhost:${port}`);
});

function shutdown() {
  cleanupScheduler.stop();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
