import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import type { ObjectStorage, StoredObjectInfo } from "./storage.js";

export type LocalObjectStorageOptions = {
  rootDir: string;
};

export function createLocalObjectStorage(options: LocalObjectStorageOptions): ObjectStorage {
  const rootDir = path.resolve(options.rootDir);

  function filePathForKey(key: string): string {
    const normalizedKey = key.replaceAll("\\", "/").replace(/^\/+/, "");
    const resolvedPath = path.resolve(rootDir, normalizedKey);

    // Never let a storage key escape the configured storage directory.
    if (!resolvedPath.startsWith(`${rootDir}${path.sep}`) && resolvedPath !== rootDir) {
      throw new Error("Invalid storage key");
    }

    return resolvedPath;
  }

  return {
    async put(key, bytes): Promise<StoredObjectInfo> {
      const filePath = filePathForKey(key);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, bytes);

      return {
        key,
        size: bytes.length
      };
    },

    async get(key): Promise<Buffer> {
      return readFile(filePathForKey(key));
    },

    getStream(key): Readable {
      return createReadStream(filePathForKey(key));
    },

    async delete(key): Promise<void> {
      await rm(filePathForKey(key), { force: true });
    },

    async exists(key): Promise<boolean> {
      try {
        await stat(filePathForKey(key));
        return true;
      } catch (error) {
        // Missing object is a normal "false" result; other disk errors should still fail.
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          return false;
        }

        throw error;
      }
    }
  };
}
