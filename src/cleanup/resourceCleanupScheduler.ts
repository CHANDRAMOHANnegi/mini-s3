import {
  cleanupExpiredResources,
  type ResourceCleanupDependencies,
  type ResourceCleanupResult
} from "./resourceCleanup.js";

type TimerHandle = number | { unref?: () => void };
type SetIntervalFn = (callback: () => void, intervalMs: number) => TimerHandle;
type ClearIntervalFn = (handle: TimerHandle) => void;

export type CleanupLogger = {
  info(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
};

export type ResourceCleanupSchedulerOptions = ResourceCleanupDependencies & {
  intervalMs: number;
  logger?: CleanupLogger;
  runImmediately?: boolean;
  now?: () => Date;
  setIntervalFn?: SetIntervalFn;
  clearIntervalFn?: ClearIntervalFn;
};

export type ResourceCleanupScheduler = {
  runOnce(): Promise<ResourceCleanupResult | null>;
  stop(): void;
};

export function startResourceCleanupScheduler(options: ResourceCleanupSchedulerOptions): ResourceCleanupScheduler {
  const logger = options.logger || console;
  const now = options.now || (() => new Date());
  const setIntervalFn = options.setIntervalFn || ((callback, intervalMs) => setInterval(callback, intervalMs));
  const clearIntervalFn =
    options.clearIntervalFn || ((handle) => clearInterval(handle as ReturnType<typeof setInterval>));
  let running = false;
  let stopped = false;

  async function runOnce(): Promise<ResourceCleanupResult | null> {
    if (running || stopped) return null;

    running = true;
    try {
      const result = await cleanupExpiredResources(
        {
          resourceStore: options.resourceStore,
          objectStorage: options.objectStorage
        },
        now()
      );
      logger.info("resource cleanup completed", result);
      return result;
    } catch (error) {
      logger.error("resource cleanup failed", error);
      return null;
    } finally {
      running = false;
    }
  }

  const timer = setIntervalFn(() => {
    void runOnce();
  }, options.intervalMs);
  if (typeof timer === "object") {
    timer.unref?.();
  }

  if (options.runImmediately) {
    void runOnce();
  }

  return {
    runOnce,
    stop() {
      if (stopped) return;
      stopped = true;
      clearIntervalFn(timer);
    }
  };
}
