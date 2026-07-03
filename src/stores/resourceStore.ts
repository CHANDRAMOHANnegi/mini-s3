import type { Resource } from "../domain/resources.js";

export type ResourceStore = {
  create(resource: Resource): Promise<Resource>;
  findById(id: string): Promise<Resource | null>;
  listByShareId(shareId: string): Promise<Resource[]>;
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

    async listByShareId(shareId) {
      return [...resources.values()]
        .filter((resource) => resource.shareId === shareId && !resource.deletedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  };
}
