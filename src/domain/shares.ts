import { randomBytes } from "node:crypto";
import { addHours } from "./expiry.js";
import { type AccessMode, normalizeAccessMode, permissionsForMode, type SharePermissions } from "./permissions.js";

export type Share = {
  id: string;
  name: string;
  accessMode: AccessMode;
  permissions: SharePermissions;
  maxResourceBytes: number;
  maxTotalBytes: number | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type CreateShareInput = {
  name?: unknown;
  accessMode?: unknown;
  expiresInHours?: unknown;
  maxResourceBytes?: unknown;
  maxTotalBytes?: unknown;
};

const defaultExpiryHours = 24;
const maxExpiryHours = 24 * 30;
const defaultMaxResourceBytes = 100 * 1024 * 1024;

export function createId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

function positiveNumber(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

export function createShare(input: CreateShareInput = {}, now = new Date()): Share {
  const accessMode = normalizeAccessMode(input.accessMode);
  const requestedExpiryHours = positiveNumber(input.expiresInHours, defaultExpiryHours);
  const expiresInHours = Math.min(requestedExpiryHours, maxExpiryHours);
  const maxResourceBytes = positiveNumber(input.maxResourceBytes, defaultMaxResourceBytes);
  const maxTotalBytes = input.maxTotalBytes == null ? null : positiveNumber(input.maxTotalBytes, maxResourceBytes);
  const timestamp = now.toISOString();

  return {
    id: createId("share"),
    name: String(input.name || "Shared resources"),
    accessMode,
    permissions: permissionsForMode(accessMode),
    maxResourceBytes,
    maxTotalBytes,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: addHours(now, expiresInHours).toISOString(),
    revokedAt: null
  };
}
