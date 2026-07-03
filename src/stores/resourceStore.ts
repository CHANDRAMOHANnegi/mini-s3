import type { Resource } from "../domain/resources.js";

export type ResourceStore = {
  create(resource: Resource): Promise<Resource>;
  findById(id: string): Promise<Resource | null>;
  listAll(): Promise<Resource[]>;
  listByShareId(shareId: string): Promise<Resource[]>;
  markDeleted(id: string, deletedAt?: Date): Promise<Resource | null>;
};

export function createMemoryResourceStore(): ResourceStore {
  const resources = new Map<string, Resource>();

  return {
    async create(resource) {
      resources.set(resource.id, resource);
      return resource;
    },

    async findById(id) {
      return resources.get(id) || null;
    },

    async listAll() {
      return [...resources.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async listByShareId(shareId) {
      return [...resources.values()]
        .filter((resource) => resource.shareId === shareId && !resource.deletedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async markDeleted(id, deletedAt = new Date()) {
      const resource = resources.get(id);

      if (!resource) return null;

      const timestamp = deletedAt.toISOString();
      const deletedResource = {
        ...resource,
        updatedAt: timestamp,
        deletedAt: timestamp
      };

      resources.set(id, deletedResource);
      return deletedResource;
    }
  };
}
