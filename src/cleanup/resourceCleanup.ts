import { isExpired } from "../domain/expiry.js";
import type { ObjectStorage } from "../storage/storage.js";
import type { ResourceStore } from "../stores/resourceStore.js";

export type ResourceCleanupDependencies = {
  resourceStore: ResourceStore;
  objectStorage: ObjectStorage;
};

export type ResourceCleanupResult = {
  scanned: number;
  expiredMarkedDeleted: number;
  bytesDeleted: number;
};

export async function cleanupExpiredResources(
  dependencies: ResourceCleanupDependencies,
  now = new Date()
): Promise<ResourceCleanupResult> {
  const resources = await dependencies.resourceStore.listAll();
  const result: ResourceCleanupResult = {
    scanned: resources.length,
    expiredMarkedDeleted: 0,
    bytesDeleted: 0
  };

  for (const resource of resources) {
    if (!isExpired(resource, now)) continue;

    if (await dependencies.objectStorage.exists(resource.storageKey)) {
      await dependencies.objectStorage.delete(resource.storageKey);
      result.bytesDeleted += 1;
    }

    if (!resource.deletedAt) {
      await dependencies.resourceStore.markDeleted(resource.id, now);
      result.expiredMarkedDeleted += 1;
    }
  }

  return result;
}
