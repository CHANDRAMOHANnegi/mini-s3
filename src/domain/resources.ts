import { createHash } from "node:crypto";
import { createId } from "./shares.js";

export type PreviewType = "image" | "video" | "audio" | "pdf" | "text" | "html" | "binary";

export type Resource = {
  id: string;
  shareId: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  storageKey: string;
  previewType: PreviewType;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  deletedAt: string | null;
};

export type CreateResourceInput = {
  shareId: string;
  originalName: string;
  mimeType?: string;
  size: number;
  bytes?: Buffer;
  expiresAt: string;
  metadata?: Record<string, unknown>;
};

export function previewTypeForMime(mimeType: string): PreviewType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "text/html") return "html";
  if (mimeType.startsWith("text/") || mimeType === "application/json") return "text";
  return "binary";
}

export function checksumForBytes(bytes: Buffer | undefined): string {
  if (!bytes) return "";
  return createHash("sha256").update(bytes).digest("hex");
}

export function createResource(input: CreateResourceInput, now = new Date()): Resource {
  const id = createId("res");
  const mimeType = input.mimeType || "application/octet-stream";
  const timestamp = now.toISOString();

  return {
    id,
    shareId: input.shareId,
    originalName: input.originalName,
    mimeType,
    size: input.size,
    checksum: checksumForBytes(input.bytes),
    storageKey: `shares/${input.shareId}/resources/${id}`,
    previewType: previewTypeForMime(mimeType),
    metadata: input.metadata || {},
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: input.expiresAt,
    deletedAt: null
  };
}
