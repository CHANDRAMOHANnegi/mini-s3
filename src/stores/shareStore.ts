import type { Share } from "../domain/shares.js";

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
