import type { Readable } from "node:stream";

export type StoredObjectInfo = {
  key: string;
  size: number;
};

// Keeps API code independent from where bytes live: disk today, S3/R2/MinIO later.
export type ObjectStorage = {
  put(key: string, bytes: Buffer): Promise<StoredObjectInfo>;
  get(key: string): Promise<Buffer>;
  getStream(key: string): Readable;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
};
