import {
  cleanupExpiredResources,
  type ResourceCleanupDependencies,
  type ResourceCleanupResult
} from "./resourceCleanup.js";

type TimerHandle = ReturnType<typeof setInterval>;

export type CleanupLogger = {
  info(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
};

export type ResourceCleanupSchedulerOptions = ResourceCleanupDependencies & {
  intervalMs: number;
  logger?: CleanupLogger;
  runImmediately?: boolean;
  now?: () => Date;
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
};

export type ResourceCleanupScheduler = {
  runOnce(): Promise<ResourceCleanupResult | null>;
  stop(): void;
};

export function startResourceCleanupScheduler(options: ResourceCleanupSchedulerOptions): ResourceCleanupScheduler {
  const logger = options.logger || console;
  const now = options.now || (() => new Date());
  const setIntervalFn = options.setIntervalFn || setInterval;
  const clearIntervalFn = options.clearIntervalFn || clearInterval;
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
  }, options.intervalMs) as TimerHandle;
  timer.unref?.();

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
