import type { Share } from "../domain/shares.js";
import { createJsonFileStore } from "./jsonFileStore.js";

export type ShareStore = {
  create(share: Share): Promise<Share>;
  findById(id: string): Promise<Share | null>;
  list(): Promise<Share[]>;
};

export function createMemoryShareStore(): ShareStore {
  const shares = new Map<string, Share>();

  return {
    async create(share) {
      shares.set(share.id, share);
      return share;
    },

    async findById(id) {
      return shares.get(id) || null;
    },

    async list() {
      return [...shares.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  };
}

export function createJsonFileShareStore(filePath: string): ShareStore {
  const fileStore = createJsonFileStore<Share>(filePath);

  return {
    async create(share) {
      const shares = await fileStore.readAll();
      await fileStore.writeAll([share, ...shares.filter((existingShare) => existingShare.id !== share.id)]);
      return share;
    },

    async findById(id) {
      const shares = await fileStore.readAll();
      return shares.find((share) => share.id === id) || null;
    },

    async list() {
      const shares = await fileStore.readAll();
      return shares.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  };
}
