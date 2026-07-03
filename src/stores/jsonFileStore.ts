import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type JsonFileStore<T> = {
  readAll(): Promise<T[]>;
  writeAll(items: T[]): Promise<void>;
};

export function createJsonFileStore<T>(filePath: string): JsonFileStore<T> {
  const resolvedPath = path.resolve(filePath);
  let writeQueue = Promise.resolve();

  async function readAll(): Promise<T[]> {
    try {
      const contents = await readFile(resolvedPath, "utf8");
      const parsed = JSON.parse(contents);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") return [];
      throw error;
    }
  }

  async function writeAll(items: T[]): Promise<void> {
    writeQueue = writeQueue.then(async () => {
      await mkdir(path.dirname(resolvedPath), { recursive: true });
      const tempPath = `${resolvedPath}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tempPath, `${JSON.stringify(items, null, 2)}\n`);
      await rename(tempPath, resolvedPath);
    });

    return writeQueue;
  }

  return {
    readAll,
    writeAll
  };
}
